const ti = require('technicalindicators');
const debug = require('debug')('alert:rule');

// Simple evaluator supporting RSI and price_change (pct over last N)
function evaluateCondition(condition, context) {
  const { indicator, operator, value, params } = condition;
  let left;
  if (indicator === 'RSI') {
    const period = (params && params.period) || 14;
    // context.priceHistory expected array of numbers (oldest->newest)
    const rsi = ti.RSI.calculate({ period, values: context.priceHistory });
    left = rsi[rsi.length - 1];
  } else if (indicator === 'price_change') {
    const lookback = (params && params.lookback) || 1;
    const ph = context.priceHistory;
    const a = ph[ph.length - 1 - lookback];
    const b = ph[ph.length - 1];
    left = ((b - a) / a) * 100;
  } else if (indicator === 'price') {
    left = context.price;
  } else {
    throw new Error('unknown indicator ' + indicator);
  }

  debug('eval', condition, left);
  switch (operator) {
    case '<': return left < value;
    case '<=': return left <= value;
    case '>': return left > value;
    case '>=': return left >= value;
    case '==': return left == value;
    default: throw new Error('unsupported operator ' + operator);
  }
}

function evaluateRule(strategy, context) {
  const results = strategy.conditions.map((c) => evaluateCondition(c, context));
  if (strategy.logic === 'AND') return results.every(Boolean);
  if (strategy.logic === 'OR') return results.some(Boolean);
  throw new Error('unknown logic ' + strategy.logic);
}

module.exports = { evaluateRule };
