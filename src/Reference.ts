export enum ReferenceType {
  ARRAY = 'arr',
  OBJECT = 'obj',
}

export default class Reference extends String {
  static PATTERN = /ref:(arr|obj):(.+)/;

  static is(str: string | Reference) {
    return Reference.PATTERN.test(str.toString());
  }

  public type: ReferenceType;
  public key: string;

  constructor(key: string, type = ReferenceType.OBJECT) {
    if (Reference.is(key)) {
      super(key);
      const match = this.match(Reference.PATTERN);
      if (!match) throw new Error(`invalid reference: ${this}`);

      this.type = match[1] as ReferenceType;
      this.key = match[2];
    } else {
      super(`ref:${type}:${key}`);
      this.type = type;
      this.key = key;
    }
  }
}
