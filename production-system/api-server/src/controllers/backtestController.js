const mongoose = require('mongoose');
const { runBacktest } = require('../services/backtestService');
const BacktestResult = require('../../../shared/models/BacktestResult');

function parseUserId(req) {
  const userId = req.headers['x-user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('invalid_or_missing_x_user_id');
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(userId);
}

async function startBacktest(req, res, next) {
  try {
    const userId = parseUserId(req);
    const result = await runBacktest({
      userId,
      strategyId: req.body.strategyId,
      symbol: req.body.symbol,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      initialCapital: req.body.initialCapital || 10000
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listBacktests(req, res, next) {
  try {
    const userId = parseUserId(req);
    const items = await BacktestResult.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

module.exports = { startBacktest, listBacktests };
