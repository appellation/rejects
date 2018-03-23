import * as Redis from 'ioredis';

export type Primitive = string | boolean | number | null;
export type Complex = { [key: string]: Complex } | Array<Primitive>;

export default class Storage {
  constructor(public readonly client: Redis.Redis) {}

  public set(key: string, obj: Complex): PromiseLike<any> {
    return this._set(this.client.multi(), key, obj).exec();
  }

  protected _set(txn: Redis.Pipeline, key: string, obj: Complex): Redis.Pipeline {
    if (Array.isArray(obj)) return txn.sadd(key, ...obj);

    for (const [name, val] of Object.entries(obj)) {
      if (typeof val === 'object' && val !== null) {
        const newKey = `${key}.${name}`;
        this._set(txn, newKey, val);
        txn.hset(key, name, `ref:${Array.isArray(val) ? 'arr' : 'obj'}:${newKey}`);
      } else {
        txn.hset(key, name, val);
      }
    }

    return txn;
  }

  public get(key: string, full = true) {
    return this._get(key, { full });
  }

  protected async _get(key: string, { full = true, type = 'obj' }): Promise<any> {
    if (type === 'arr') return this.client.smembers(key);

    const data = await this.client.hgetall(key);
    for (const [name, val] of Object.entries(data) as [string, string][]) {
      if (val.startsWith('ref:') && full) {
        const [, type, newKey] = val.split(':');
        data[name] = await this._get(newKey, { type, full });
      }
    }

    return data;
  }
}
