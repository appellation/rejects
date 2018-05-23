import * as Redis from 'ioredis';
import { chunk, isEmpty, isObjectLike, flatten, mapKeys, mapValues } from 'lodash';
import hyperid = require('hyperid');
import Reference, { ReferenceType } from './Reference';

export default class Rejects {
  public generateID: () => string;

  constructor(public readonly client: Redis.Redis) {
    this.generateID = hyperid();
  }

  public async delete(key: string): Promise<number> {
    const data = await this.client.hgetall(key);
    const promises: Promise<number>[] = [];

    for (const ref of Object.values(data) as string[]) {
      if (Reference.is(ref)) {
        const { type, key: newKey } = new Reference(ref).decode();
        promises.push(this.delete(newKey));
      }
    }

    if (promises.length) await Promise.all(promises);
    return this.client.del(key);
  }

  public upsert(key: string, obj: object): Promise<Array<0 | 1>> {
    if (key.includes('.')) {
      const route = key.split('.');
      let newKey: string | undefined;
      while (newKey = route.pop()) {
        if (route.length) {
          obj = { [newKey]: obj };
        } else {
          key = newKey;
          break;
        }
      }
    }

    const queries: Set<PromiseLike<0 | 1>> = new Set();
    this._upsert(key, obj, queries);
    return Promise.all(queries).then(flatten);
  }

  protected _upsert(
    key: string,
    obj: object,
    queries: Set<PromiseLike<0 | 1>>,
    seen: any[] = [],
  ): void {
    if (isEmpty(obj)) return;

    if (seen.includes(obj)) throw new TypeError('cannot store circular structure in Redis');
    if (isObjectLike(obj)) seen.push(obj);

    if (Array.isArray(obj)) obj = mapKeys(obj, this.generateID);

    const toSet = mapValues(obj, (val, nestedKey): string => {
      if (isObjectLike(val) && !(val instanceof Reference)) {
        const newKey = `${key}.${nestedKey}`;
        this._upsert(newKey, val, queries, seen);
        return new Reference(newKey, Array.isArray(val) ? ReferenceType.ARRAY : ReferenceType.OBJECT).toString();
      }

      return val;
    });

    queries.add(this.client.hmset(key, toSet));
  }

  public async set(key: string, obj: object): Promise<Array<0 | 1>> {
    await this.delete(key);
    return this.upsert(key, obj);
  }

  public async get<T = any>(key: string, opts?: { type?: ReferenceType, depth?: number }): Promise<T | null> {
    return this._get<T>(key, opts);
  }

  protected async _get<T>(
    key: string,
    {
      type = ReferenceType.OBJECT,
      depth = -1,
      currentDepth = 0
    }: {
      type?: ReferenceType;
      depth?: number;
      currentDepth?: number;
    } = {}
  ): Promise<T | null> {
    const data = await this.client.hgetall(key);
    if (!Object.keys(data).length) return null;

    const nested: [string, Promise<T | null>][] = [];
    if (depth < 0 || currentDepth < depth) {
      for (const [name, val] of Object.entries(data) as [string, string][]) {
        if (Reference.is(val)) {
          const { type, key: newKey } = new Reference(val).decode();
          nested.push([name, this._get(newKey, { type, depth, currentDepth: currentDepth + 1 })]);
        }
      }
    }

    await Promise.all(nested.map(async ([name, call]) => data[name] = await call));
    return type === ReferenceType.ARRAY ? Object.values(data) : data;
  }

  public incr(key: string, amt: number = 1): PromiseLike<number> {
    if (!key.includes('.')) return Promise.reject(new Error(`key "${key}" does not contain any fields`));
    const isFloat = Math.floor(amt) !== amt;

    const route = key.split('.');
    const field = route.pop();
    if (field && route.length) {
      if (isFloat) return this.client.hincrbyfloat(route.join('.'), field, amt);
      return this.client.hincrby(route.join('.'), field, amt);
    }

    return Promise.reject(new Error(`error parsing key "${key}" for increment`));
  }

  public keys(key: string): PromiseLike<string[]> {
    return this.client.hkeys(key);
  }

  public size(key: string): PromiseLike<number> {
    return this.client.hlen(key);
  }
}

export {
  Reference,
  ReferenceType,
  Rejects,
}
