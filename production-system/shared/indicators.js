function ema(values, period) {
  if (!values.length || values.length < period) return null;
  const multiplier = 2 / (period + 1);
  let emaValue = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    emaValue = (values[i] - emaValue) * multiplier + emaValue;
  }
  return emaValue;
}

function rsi(closes, period = 14) {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function macd(closes, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  if (closes.length < longPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null };
  }

  const macdSeries = [];
  for (let i = longPeriod - 1; i < closes.length; i += 1) {
    const window = closes.slice(0, i + 1);
    const shortEma = ema(window, shortPeriod);
    const longEma = ema(window, longPeriod);
    macdSeries.push(shortEma - longEma);
  }

  const signal = ema(macdSeries, signalPeriod);
  const macdValue = macdSeries[macdSeries.length - 1];

  return {
    macd: macdValue,
    signal,
    histogram: signal == null ? null : macdValue - signal
  };
}

module.exports = {
  rsi,
  macd,
  ema
};
