export enum ReferenceType {
  ARRAY = 'arr',
  OBJECT = 'obj',
}

export default class Reference extends String {
  static is(str: string) {
    return str.startsWith('ref:');
  }

  constructor(key: string, type = ReferenceType.OBJECT) {
    if (Reference.is(key)) super(key);
    else super(`ref:${type}:${key}`);
  }

  public decode() {
    const [ref, type, key] = this.split(':');
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
}
