import * as Redis from 'ioredis';

export type Primitive = string | boolean | number | null;
export type Complex = { [key: string]: Complex } | Array<Primitive>;

export enum ReferenceType {
  ARRAY = 'arr',
  OBJECT = 'obj',
}

export interface QueryOptions {
  full?: boolean,
  type?: ReferenceType,
  txn?: Redis.Pipeline,
}

export default class Storage {
  static isReference(str: string) {
    return str.startsWith('ref:');
  }

  static reference(str: string) {
    const [ref, type, key] = str.split(':');
    if (ref !== 'ref' || !type || !key) throw new Error('attempted to derive reference from non-reference key');

    let refType: ReferenceType;
    switch (type) {
      case 'arr':
        refType = ReferenceType.ARRAY;
        break;
      case 'obj':
        refType = ReferenceType.OBJECT;
        break;
      default:
        throw new Error('attempted to derive reference from non-reference key');
    }

    return { type: refType, key };
  }

  constructor(public readonly client: Redis.Redis) {}

  public delete(key: string, options: QueryOptions & { txn: Redis.Pipeline }): Redis.Pipeline;
  public delete(key: string, options?: QueryOptions): PromiseLike<any>;
  public delete(key: string, options: QueryOptions = {}): PromiseLike<any> | Redis.Pipeline {
    const del = this._delete(key, options);
    if (options.txn) return del;
    return del.exec();
  }

  protected _delete(key: string, { full = true, type = ReferenceType.OBJECT, txn = this.client.pipeline() }: QueryOptions): Redis.Pipeline {
    if (type === 'obj' && full) {
      txn.hgetall(key, (err, data) => {
        if (err) throw err;
        if (typeof data === 'string') throw new Error('cannot delete nested objects using a transaction');

        for (const ref of Object.values(data) as string[]) {
          if (Storage.isReference(ref)) {
            const { type, key: newKey } = Storage.reference(ref);
            this._delete(newKey, { type, full, txn });
          }
        }
      });
    }

    return txn.del(key);
  }

  public upsert(key: string, obj: Complex, options: QueryOptions & { txn: Redis.Pipeline }): Redis.Pipeline;
  public upsert(key: string, obj: Complex, options?: QueryOptions): PromiseLike<any>;
  public upsert(key: string, obj: Complex, options: QueryOptions = {}): PromiseLike<any> | Redis.Pipeline {
    const upsert = this._upsert(key, obj);
    if (options.txn) return upsert;
    return upsert.exec();
  }

  protected _upsert(key: string, obj: Complex, { txn = this.client.multi(), seen = [] }: QueryOptions & { seen?: any[] } = {}): Redis.Pipeline {
    if (seen.includes(obj)) throw new TypeError('cannot store circular structure in Redis');
    seen.push(obj);

    if (Array.isArray(obj)) return txn.sadd(key, ...obj);

    for (const [name, val] of Object.entries(obj)) {
      if (typeof val === 'object' && val !== null) {
        const newKey = `${key}.${name}`;
        this._upsert(newKey, val, { txn, seen });
        txn.hset(key, name, `ref:${Array.isArray(val) ? ReferenceType.ARRAY : ReferenceType.OBJECT}:${newKey}`);
      } else {
        txn.hset(key, name, val);
      }
    }

    return txn;
  }

  public set(key: string, obj: Complex, options: QueryOptions & { txn: Redis.Pipeline }): Redis.Pipeline;
  public set(key: string, obj: Complex, options?: QueryOptions): PromiseLike<any>;
  public set(key: string, obj: Complex, options: QueryOptions = {}): PromiseLike<any> | Redis.Pipeline {
    return this.delete(key, options).then(() => this.upsert(key, obj, options));
  }

  public async get(key: string, { full = true, type = ReferenceType.OBJECT } = {}): Promise<any> {
    if (type === ReferenceType.ARRAY) return this.client.smembers(key);

    const data = await this.client.hgetall(key);
    for (const [name, val] of Object.entries(data) as [string, string][]) {
      if (Storage.isReference(val) && full) {
        const { type, key: newKey } = Storage.reference(val);
        data[name] = await this.get(newKey, { type, full });
      }
    }

    return data;
  }
}
