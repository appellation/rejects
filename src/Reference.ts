export enum ReferenceType {
  ARRAY = 'arr',
  OBJECT = 'obj',
}

const types = new Set(Object.values(ReferenceType));

export default class Reference extends String {
  static is(str: string) {
    return str.startsWith('ref:');
  }

  constructor(key: string, type = ReferenceType.OBJECT) {
    if (Reference.is(key)) super(key);
    else super(`ref:${type}:${key}`);
  }

  public decode(): { type: ReferenceType, key: string } {
    const [ref, type, key] = this.split(':') as [string, ReferenceType, string];
    if (ref !== 'ref' || !type || !key || !types.has(type)) throw new Error('attempted to derive reference from non-reference key');
    return { type, key };
  }
}
