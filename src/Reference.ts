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
    if (Reference.is(key)) {
      super(key);

      // ref:arr:memes
      this.type = key.substring(4, 7) as ReferenceType;
      this.key = key.substring(8);
    } else {
      super(`ref:${type}:${key}`);
      this.type = type;
      this.key = key;
    }
  }
}
