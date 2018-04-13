import * as Redis from 'ioredis';
import Reference, { ReferenceType } from './Reference';

export type Primitive = string | boolean | number | null;
export type Complex = { [key: string]: Complex | Primitive } | Array<Primitive>;

export interface QueryOptions {
  full?: boolean,
  type?: ReferenceType,
  txn?: Redis.Pipeline,
}

export default class Storage {
  constructor(public readonly client: Redis.Redis) {}

  public async delete(key: string, { full = true } = {}): Promise<any> {
    if (full) {
      const data = await this.client.hgetall(key);
      const promises = [];

      for (const ref of Object.values(data) as string[]) {
        if (Reference.is(ref)) {
          const { type, key: newKey } = new Reference(ref).decode();
          promises.push(this.delete(newKey, { full }));
        }
      }

      if (promises.length) await Promise.all(promises);
    }

    return this.client.del(key);
  }

  public upsert(key: string, obj: Complex, options: { txn: Redis.Pipeline }): Redis.Pipeline;
  public upsert(key: string, obj: Complex, options?: { txn?: Redis.Pipeline }): PromiseLike<any>;
  public upsert(key: string, obj: Complex, options: QueryOptions = {}): PromiseLike<any> | Redis.Pipeline {
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

    const upsert = this._upsert(key, obj, options);
    if (options.txn) return upsert;
    return upsert.exec();
  }

  protected _upsert(
    key: string,
    obj: Complex,
    {
      txn = this.client.multi(),
      seen = [],
    }: QueryOptions & { seen?: any[] } = {}
  ): Redis.Pipeline {
    if (seen.includes(obj)) throw new TypeError('cannot store circular structure in Redis');
    seen.push(obj);

    if (Array.isArray(obj)) {
      const copy: Complex = {};
      for (const elem of obj) {
        const uuid = Math.random().toString(36).substring(2, 15);
        copy[uuid] = elem;
      }

      obj = copy;
    }

    for (const [name, val] of Object.entries(obj)) {
      if (typeof val === 'object' && !(val instanceof Reference) && val !== null) {
        const newKey = `${key}.${name}`;
        this._upsert(newKey, val, { txn, seen });
        txn.hset(key, name, new Reference(newKey, Array.isArray(val) ? ReferenceType.ARRAY : ReferenceType.OBJECT));
      } else {
        txn.hset(key, name, val);
      }
    }

    return txn;
  }

  public set(key: string, obj: Complex, options?: QueryOptions): Promise<any>;
  public async set(key: string, obj: Complex, options: QueryOptions = {}): Promise<any> {
    await this.delete(key);
    return this.upsert(key, obj, options);
  }

  public async get(key: string, opts?: { full?: boolean, type?: ReferenceType, depth?: number }) {
    return this._get(key, opts);
  }

  protected async _get(
    key: string,
    {
      full = true,
      type = ReferenceType.OBJECT,
      depth = -1,
      currentDepth = 0
    }: {
      full?: boolean;
      type?: ReferenceType;
      depth?: number;
      currentDepth?: number;
    } = {}
  ): Promise<any> {
    const data = await this.client.hgetall(key);
    if (!Object.keys(data).length) return null;

    if (depth < 0 || currentDepth < depth) {
      for (const [name, val] of Object.entries(data) as [string, string][]) {
        if (Reference.is(val) && full) {
          const { type, key: newKey } = new Reference(val).decode();
          data[name] = await this._get(newKey, { type, full, depth, currentDepth: currentDepth + 1 });
        }
      }
    }

    return type === ReferenceType.ARRAY ? Object.values(data) : data;
  }

  public keys(key: string): PromiseLike<any[]> {
    return this.client.hkeys(key);
  }

  public size(key: string): PromiseLike<number> {
    return this.client.hlen(key);
  }
}

export {
  Reference,
  ReferenceType,
  Storage,
}
