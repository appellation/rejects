const { default: Storage, Reference } = require('../dist');
const Redis = require('ioredis');
const { performance } = require('perf_hooks');
const guild = require('./guild.json');

const r = new Redis();
const s = new Storage(r);

let data;
(async () => {
  await r.flushall();
  performance.mark('start');

  const data = {};
  for (let i = 0; i < 1e5; i++) data[i.toString()] = i;
  const nest = Array(1).fill('test').join('.');

  performance.mark('begin set');
  await s.upsert(nest, data);
  performance.mark('end set');

  performance.mark('begin get');
  await s.get(nest);
  performance.mark('end get');

  performance.measure('get', 'begin get', 'end get');
  performance.measure('set', 'begin set', 'end set');

  console.log('get', performance.getEntriesByName('get'));
  console.log('set', performance.getEntriesByName('set'));

  r.disconnect();
})();
