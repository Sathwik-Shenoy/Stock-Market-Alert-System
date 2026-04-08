const { rsi, macd } = require('../../shared/indicators');
const { evaluateAst } = require('../../shared/dsl/strategyDsl');

function compare(actual, operator, expected) {
  if (actual == null || Number.isNaN(actual)) return false;
  switch (operator) {
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    default: return false;
  }
}

function buildIndicatorContext({ event, closes }) {
  const currentPrice = event.payload.price;
  const prevPrice = closes.length > 1 ? closes[closes.length - 2] : currentPrice;
  const priceChange = prevPrice === 0 ? 0 : ((currentPrice - prevPrice) / prevPrice) * 100;

  const rsiValue = event.payload.indicators?.rsi ?? rsi(closes, 14);
  const macdValues = event.payload.indicators?.macd != null
    ? {
        macd: event.payload.indicators.macd,
        signal: event.payload.indicators.macdSignal ?? null,
        histogram: event.payload.indicators.macdHistogram ?? null
      }
    : macd(closes, 12, 26, 9);

  return {
    price: currentPrice,
    RSI: rsiValue,
    MACD: macdValues.macd,
    MACD_SIGNAL: macdValues.signal,
    MACD_HISTOGRAM: macdValues.histogram,
    price_change: priceChange
  };
}

function evaluateStrategy(strategy, indicatorContext) {
  if (strategy.dsl && strategy.compiled && strategy.compiled.ast) {
    return evaluateAst(strategy.compiled.ast, indicatorContext);
  }

  const evaluations = strategy.conditions.map((condition) => {
    const actual = indicatorContext[condition.indicator];
    const matched = compare(actual, condition.operator, condition.value);
    return {
      indicator: condition.indicator,
      operator: condition.operator,
      expected: condition.value,
      actual,
      matched
    };
  });

  const result = strategy.logic === 'OR'
    ? evaluations.some((x) => x.matched)
    : evaluations.every((x) => x.matched);

  return {
    triggered: result,
    evaluations
  };
}

module.exports = { evaluateStrategy, buildIndicatorContext };
