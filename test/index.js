const { default: Storage } = require('../dist');
const Redis = require('ioredis');
const guild = require('./guild.json');

const r = new Redis();
const s = new Storage(r);

(async () => {
  await r.flushall();

  await s.set(`guild.${guild.id}`, guild);
  console.log(await s.get('guild'));
  // console.log(await s.get('no exist'));

  // await s.upsert('guild.members', { id: { nick: 'meme2' } });
  // console.log(await s.get('guild'));

  // await s.set('guild', { test: 'data' });
  // console.log(await s.get('guild'));
})();
