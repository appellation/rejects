export enum RawType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  NULL = 'null',
  UNDEFINED = 'undefined',
  SYMBOL = 'symbol',
}

export type Primitive = boolean | number | string | symbol | null | undefined;

export default class Raw extends String {
  public static isPrimitive(val: unknown): val is Primitive {
    return val === null || !['function', 'object'].includes(typeof val);
  }

  public static is(str: unknown): str is string {
    return typeof str === 'string' && str.startsWith('raw:');
  }

  public type: RawType;
  public value: Primitive;

  constructor(val: unknown) {
    if (!Raw.isPrimitive(val)) throw new Error('attempted to derive raw value from non-primitive');

    let type: string;
    if (Raw.is(val)) {
      [, type, val as string] = val.split(':');

      switch (type) {
        case RawType.BOOLEAN:
          val = val === 'true' ? true : false;
          break;
        case RawType.NULL:
          val = null;
          break;
        case RawType.NUMBER:
          val = val.includes('.') ? parseFloat(val) : parseInt(val);
          break;
        case RawType.SYMBOL:
          val = Symbol(val);
          break;
        case RawType.UNDEFINED:
          val = undefined;
          break;
        case RawType.STRING:
          val = String(val);
          break;
        default:
          throw new Error(`attempted to derive raw value from invalid type "${type}"`);
      }

      super(val);
    } else {
      type = val === null ? 'null' : typeof val;
      super(`raw:${type}:${String(val)}`);
    }

    this.type = type as RawType;
    this.value = val as Primitive;
  }
}
