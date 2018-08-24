const { default: Storage } = require('../dist');
const Redis = require('ioredis');
const { performance, PerformanceObserver } = require('perf_hooks');
const guild = require('./guild.json');

const r = new Redis();
const s = new Storage(r);

const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) console.log(entry);
});
observer.observe({ entryTypes: ['measure'] });

let data;
(async () => {
  await r.flushall();
  performance.mark('start');

  const data = guild;
  const nest = 'guild';
  // for (let i = 0; i < 1e5; i++) data[i.toString()] = i;
  // const nest = Array(1000).fill('test').join('.');

  performance.mark('begin set');
  await s.upsert(nest, data);
  performance.mark('end set');

  performance.mark('begin get');
  const out = await s.get(nest);
  performance.mark('end get');
  console.log(out);

  performance.measure('get', 'begin get', 'end get');
  performance.measure('set', 'begin set', 'end set');

  r.disconnect();
  observer.disconnect();
})().catch(console.error);
