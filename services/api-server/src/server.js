const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { promClient } = require('stock-shared');
const { runBacktest } = require('./backtester');
const { Backtest, Historical } = require('./models');
const rateLimit = require('./middleware/rateLimit');

const app = express();
app.use(bodyParser.json());
app.use(rateLimit);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.post('/backtest', async (req, res) => {
  const { strategy, symbol, from, to } = req.body;
  if (!strategy || !symbol || !from || !to) return res.status(400).send({ error: 'missing' });
  const result = await runBacktest(strategy, symbol, from, to);
  res.send(result);
});

// historical with pagination
app.get('/historical/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(100, parseInt(req.query.limit || '100'));
  const skip = (page - 1) * limit;
  const docs = await Historical.find({ symbol }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
  res.send({ page, limit, data: docs });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/stock', { serverSelectionTimeoutMS: 5000 });
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('api-server listening', port));
}

if (require.main === module) start().catch(e => { console.error(e); process.exit(1); });
