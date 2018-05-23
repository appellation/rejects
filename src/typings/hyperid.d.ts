declare module 'hyperid' {
  type Instance = () => string;
  function HyperID(): Instance;

  export = HyperID;
}
