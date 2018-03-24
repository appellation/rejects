# Redis Objects

Simple abstractions for storing complex JSON data in Redis. Supports simple nested objects and arrays of primitives.

## Example

```js
const Redis = require('ioredis');
const Storage = require('rejects');

const r = new Redis();
const s = new Storage();

s.set('some key', {
  id: 'some id',
  array: [
    'array',
    'of',
    'primitives',
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

Nested data can be directly accessed by concatentating properties together with a `.`.  For example:

```js
const data = await s.get('some key.data.with'); // ['an', 'array']
```

## Reference

### `default`

- **`constructor(redis: Redis)`** - make a new instance and give it an [ioredis](https://github.com/luin/ioredis) client
- `get(key: string, { full = true })` - get a complex object. If full is true, will resolve all references to nested data.  If full is false, will set the property to a string of the form `ref:<type>:<key>` where type is `arr` (Redis set) or `obj` (Redis hash) and `key` points to the Redis key where the data is stored.
- `set(key: string, data: any)` - set complex data.
