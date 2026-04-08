const mongoose = require('mongoose');
const Strategy = require('../../../shared/models/Strategy');
const { compileDsl } = require('../../../shared/dsl/strategyDsl');

function parseUserId(req) {
  const userId = req.headers['x-user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('invalid_or_missing_x_user_id');
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(userId);
}

async function createStrategy(req, res, next) {
  try {
    const userId = parseUserId(req);
    const body = req.body;

    let compiled = null;
    let dsl = '';
    if (body.dsl) {
      dsl = String(body.dsl);
      compiled = compileDsl(dsl);
    }

    const strategy = await Strategy.create({
      userId,
      name: body.name,
      symbol: body.symbol,
      dsl,
      compiled,
      logic: body.logic || 'AND',
      conditions: body.conditions || [],
      cooldownSec: body.cooldownSec ?? 60,
      isActive: true
    });

    res.status(201).json(strategy);
  } catch (error) {
    next(error);
  }
}

async function listStrategies(req, res, next) {
  try {
    const userId = parseUserId(req);
    const strategies = await Strategy.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ items: strategies });
  } catch (error) {
    next(error);
  }
}

module.exports = { createStrategy, listStrategies };
