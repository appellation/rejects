# Redis Objects

Simple abstractions for storing complex JSON data in Redis. Supports storage of complex objects and arrays.

## Example

```js
const Redis = require('ioredis');
const Storage = require('rejects');

const r = new Redis();
const s = new Storage(r);

s.set('some key', {
  id: 'some id',
  array: [
    'array',
    'of',
    'primitives',
    {
      and: 'an',
      object: 'too',
    },
  ],
  data: {
    complex: 'nested',
    data: 'here',
    with: [
      'an',
      'array',
    ],
  },
});
```

Nested data can be directly accessed and modified by concatentating properties together with a `.`.  For example:

```js
const data = await s.get('some key'); // { id: 'some id', ... }
const with = await s.get('some key.data.with', { type: 'arr' }); // ['an', 'array']
const update = await s.set('some key.data.array', ['new', 'array']);
```

Note that the type must be explicitly set to `arr` when directly accessing an array.

References to other data can be created:

```js
const { Reference } = require('rejects');

await s.set('some other key', {
  value: 'hello world',
});

await s.set('some key', {
  id: 'an id',
  reference: new Reference('some other key.value'),
});

const data = await s.get('some key'); // { id: 'an id', reference: 'hello world' }
```

References can be created within arrays to create arrays of references.  The `Reference` constructor takes a second parameter of either `obj` or `arr` to differentiate between references to arrays and objects (default to `obj`).

## Caveats

- do not store hashes with values beginning with `ref:`, as this is will confuse the library and produce errors when fetching nested data.
- array entries can never be overridden unless you delete the entire entry and re-add the elements.  *caveat:* this is actually a lie, but not supported by the library.

## Reference

### `default`

- **`constructor(redis: Redis)`** - make a new instance and give it an [ioredis](https://github.com/luin/ioredis) client
- `get(key: string, { full = true, type = 'obj' })` - get a complex object.  Valid type values are `arr` and `obj` depending on the anticipated data type of the fetched data. If full is true, will resolve all references to nested data.  If full is false, will set the property to a string of the form `ref:<type>:<key>` where type is `arr` or `obj`, and `key` points to the Redis key where the data is stored.
- `set(key: string, data: any)` - set complex data; will overwrite and remove existing data that is changed or removed in the new data.
- `upsert(key: string, data: any)` - set complex data; will overwrite but not remove existing data.
- `delete(key: string)` - delete all complex data at a given key.
