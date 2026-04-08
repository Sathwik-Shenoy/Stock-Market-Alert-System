const MarketEvent = require('../../../shared/models/MarketEvent');
const Strategy = require('../../../shared/models/Strategy');
const BacktestResult = require('../../../shared/models/BacktestResult');
const { evaluateStrategy, buildIndicatorContext } = require('../../../alert-engine/src/ruleEngine');

function computeMaxDrawdown(equityCurve) {
  let peak = equityCurve[0] || 0;
  let maxDd = 0;

  for (const value of equityCurve) {
    if (value > peak) peak = value;
    const dd = peak === 0 ? 0 : ((peak - value) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
  }

  return maxDd;
}

async function loadHistoricalData({ symbol, startTime, endTime, page = 1, limit = 100 }) {
  const q = {
    symbol,
    marketTimestamp: {
      $gte: new Date(startTime),
      $lte: new Date(endTime)
    }
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    MarketEvent.find(q)
      .sort({ marketTimestamp: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    MarketEvent.countDocuments(q)
  ]);

  return {
    items,
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  };
}

async function runBacktest({ userId, strategyId, symbol, startTime, endTime, initialCapital = 10000 }) {
  const strategy = await Strategy.findOne({ _id: strategyId, userId }).lean();
  if (!strategy) {
    throw new Error('strategy_not_found');
  }

  const events = await MarketEvent.find({
    symbol,
    marketTimestamp: { $gte: new Date(startTime), $lte: new Date(endTime) }
  })
    .sort({ marketTimestamp: 1 })
    .lean();

  if (!events.length) {
    throw new Error('no_historical_data');
  }

  let cash = initialCapital;
  let positionQty = 0;
  let entryPrice = 0;
  let wins = 0;
  let losses = 0;
  const trades = [];
  const closes = [];
  const equityCurve = [];

  for (const event of events) {
    const price = event.payload.price;
    closes.push(price);
    if (closes.length > 300) closes.shift();

    const indicatorContext = buildIndicatorContext({ event, closes });
    const { triggered } = evaluateStrategy(strategy, indicatorContext);

    if (triggered && positionQty === 0) {
      positionQty = Math.floor(cash / price);
      if (positionQty > 0) {
        cash -= positionQty * price;
        entryPrice = price;
        trades.push({ side: 'BUY', timestamp: event.marketTimestamp, price, quantity: positionQty, pnl: 0 });
      }
    } else if (!triggered && positionQty > 0) {
      const pnl = (price - entryPrice) * positionQty;
      cash += positionQty * price;
      trades.push({ side: 'SELL', timestamp: event.marketTimestamp, price, quantity: positionQty, pnl });
      if (pnl >= 0) wins += 1;
      else losses += 1;
      positionQty = 0;
      entryPrice = 0;
    }

    const equity = cash + positionQty * price;
    equityCurve.push({ t: event.marketTimestamp, v: equity });
  }

  if (positionQty > 0) {
    const lastPrice = events[events.length - 1].payload.price;
    const pnl = (lastPrice - entryPrice) * positionQty;
    cash += positionQty * lastPrice;
    trades.push({ side: 'SELL', timestamp: events[events.length - 1].marketTimestamp, price: lastPrice, quantity: positionQty, pnl });
    if (pnl >= 0) wins += 1;
    else losses += 1;
  }

  const endingEquity = cash;
  const totalReturnPct = ((endingEquity - initialCapital) / initialCapital) * 100;
  const totalClosedTrades = wins + losses;
  const winRatePct = totalClosedTrades ? (wins / totalClosedTrades) * 100 : 0;
  const drawdown = computeMaxDrawdown(equityCurve.map((x) => x.v));

  const result = await BacktestResult.create({
    userId,
    strategyId,
    symbol,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    metrics: {
      totalReturnPct,
      winRatePct,
      maxDrawdownPct: drawdown,
      totalTrades: totalClosedTrades
    },
    equityCurve,
    trades
  });

  return result;
}

module.exports = {
  loadHistoricalData,
  runBacktest
};
