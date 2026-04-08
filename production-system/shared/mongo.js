const mongoose = require('mongoose');
const { env } = require('./env');

async function connectMongo() {
  await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000
  });

  return mongoose.connection;
}

module.exports = { connectMongo };
