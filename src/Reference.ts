export enum ReferenceType {
  ARRAY = 'arr',
  OBJECT = 'obj',
}

export default class Reference extends String {
  static is(str: string | Reference) {
    return str.startsWith('ref:');
  }

  public type: ReferenceType;
  public key: string;

  constructor(key: string, type = ReferenceType.OBJECT) {
    if (Reference.is(key)) super(key);
    else super(`ref:${type}:${key}`);

    [, type, key] = this.split(':') as [string, ReferenceType, string];
    this.type = type;
    this.key = key;
  }
}
