const { default: Storage, Reference } = require('../dist');
const Redis = require('ioredis');
const guild = require('./guild.json');

const r = new Redis();
const s = new Storage(r);

(async () => {
  await r.flushall();

  // await s.set(`guilds.${guild.id}`, guild);
  // console.log(await s.get('guilds'));

  // await s.upsert(`guilds.${guild.id}.members`, { id: { nick: 'meme2' } });
  // console.log(await s.get(`guilds.${guild.id}.members`));

  // await s.set('guilds', { test: 'data' });
  // console.log(await s.get('guilds'));

  await s.set('guilds', { id: new Reference('not exists') });
  console.log(await s.get('guilds'));
})();
