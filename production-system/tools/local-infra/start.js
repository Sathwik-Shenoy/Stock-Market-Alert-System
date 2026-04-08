const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisMemoryServer = require('redis-memory-server').default;

async function main() {
  const mongo = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'stock_prod' }
  });

  const redisServer = new RedisMemoryServer({
    // Use default redis version supported by the package.
    instance: { port: 6379 }
  });
  await redisServer.start();

  console.log('LOCAL_INFRA_READY');
  console.log(`MONGO_URI=${mongo.getUri('stock_prod')}`);
  console.log(`REDIS_URL=redis://127.0.0.1:6379`);

  // Keep process alive until SIGINT.
  process.on('SIGINT', async () => {
    await redisServer.stop();
    await mongo.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

