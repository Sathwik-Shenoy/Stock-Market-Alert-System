const { Historical, Backtest } = require('./models');

function computeMetrics(trades, equitySeries) {
  const totalReturn = (equitySeries[equitySeries.length - 1] / equitySeries[0] - 1) * 100;
  const wins = trades.filter(t => t.pnl > 0).length;
  const winRate = trades.length ? wins / trades.length : 0;
  // max drawdown
  let peak = equitySeries[0];
  let maxDD = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return { totalReturn, winRate, maxDrawdown: maxDD };
}

async function runBacktest(strategy, symbol, from, to) {
  const docs = await Historical.find({ symbol, timestamp: { $gte: new Date(from), $lte: new Date(to) } }).sort({ timestamp: 1 }).lean();
  const prices = docs.map(d => d.price);
  // naive strategy: evaluate rule per bar using alert-engine logic assumptions
  const trades = [];
  let position = null;
  const equity = [10000];
  for (let i = 0; i < prices.length; i++) {
    // context priceHistory: last 200
    const priceHistory = prices.slice(Math.max(0, i - 199), i + 1);
    // evaluate: reuse minimal evaluator inline
    const ctx = { price: prices[i], priceHistory };
    let triggered = true;
    for (const c of strategy.conditions) {
      // only price and price_change and RSI handled; for brevity treat comparisons
      // reuse simple eval from alert-engine in production you would import
      // Here just handle price thresholds
      if (c.indicator === 'price') {
        const lhs = ctx.price;
        if (c.operator === '<' && !(lhs < c.value)) triggered = false;
        if (c.operator === '>' && !(lhs > c.value)) triggered = false;
      }
    }
    if (triggered && !position) {
      position = { entryPrice: prices[i], entryIndex: i };
    }
    if (!triggered && position) {
      const pnl = prices[i] - position.entryPrice;
      trades.push({ entry: position.entryIndex, exit: i, pnl });
      const newEq = equity[equity.length - 1] + pnl * 100; // scaled
      equity.push(newEq);
      position = null;
    }
  }
  const metrics = computeMetrics(trades, equity);
  const rec = await Backtest.create({ strategy, metrics });
  return { id: rec._id, metrics };
}

module.exports = { runBacktest };
