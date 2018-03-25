const { default: Storage } = require('../dist');
const Redis = require('ioredis');

const r = new Redis();
const s = new Storage(r);

(async () => {
  await r.flushall();

  await s.upsert('guild.members', { id3: 'meme3' });
  console.log(await s.get('guild'));

  // const thing = { key: 'thing' };
  // thing.thing = thing;

  await s.set('guild', {
    name: 'xd',
    owner: 'owo',
    // thing,
    members: {
      id: {
        nick: 'meme',
        joinedAt: 20,
      },
      id2: {
        nick: 'meme2',
        joinedAt: 30,
      },
    },
    nested: {
      key: 'value',
    },
    list: [
      'item',
      'other item',
    ],
  });

  console.log(await s.get('guild', { full: false }));

  await s.upsert('guild.members', { id: { nick: 'meme2' } });
  console.log(await s.get('guild', { full: false }));

  await s.set('guild', { test: 'data' });
  console.log(await s.get('guild', { full: false }));
})();
