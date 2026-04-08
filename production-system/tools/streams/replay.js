const Redis = require('ioredis');

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const stream = arg('stream', 'stream:market.ticks.v1');
  const group = arg('group', 'alert-engine.v1');
  const startId = arg('startId', '0-0');
  const mode = arg('mode', 'newgroup'); // newgroup | setid
  const newGroup = arg('newGroup', `${group}.replay.${Date.now()}`);

  const redis = new Redis(redisUrl);
  try {
    if (mode === 'setid') {
      // WARNING: pending entries remain pending. Use only when you understand PEL semantics.
      await redis.xgroup('SETID', stream, group, startId);
      console.log(JSON.stringify({ ok: true, mode, stream, group, startId }));
      return;
    }

    if (mode === 'newgroup') {
      await redis.xgroup('CREATE', stream, newGroup, startId, 'MKSTREAM');
      console.log(JSON.stringify({ ok: true, mode, stream, group: newGroup, startId }));
      return;
    }

    throw new Error('invalid_mode');
  } finally {
    redis.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

