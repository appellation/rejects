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

  performance.mark('pre-set 1');
  await s.set(`guilds.${guild.id}`, guild);
  performance.mark('post-set 1')

  performance.mark('pre-get 1');
  data = await s.get('guilds');
  performance.mark('post-get 1');
  console.log(data);

  // await s.upsert(`guilds.${guild.id}.members`, { id: { nick: 'meme2' } });
  // console.log(await s.get(`guilds.${guild.id}.members`));

  performance.mark('pre-set 2');
  await s.set('thing', { test: '1' });
  performance.mark('post-set 2');

  performance.mark('pre-get 2');
  data = await s.get('thing');
  performance.mark('post-get 2');
  console.log(data);

  await s.incr('thing.test', 1);
  console.log(await s.get('thing'));

  // await s.set(`guilds.${guild.id}`, guild);
  // console.log(await s.get('guilds'));
  console.log(await r.info('commandstats'));

  performance.measure('large set', 'pre-set 1', 'post-set 1');
  performance.measure('large get', 'pre-get 1', 'post-get 1');

  console.log('large set', performance.getEntriesByName('large set')[0]);
  console.log('large get', performance.getEntriesByName('large get')[0]);

  r.disconnect();
})();
