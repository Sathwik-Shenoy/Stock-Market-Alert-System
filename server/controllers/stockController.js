const axios = require('axios');
const StockData = require('../models/StockData');

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Technical Indicators Calculator
 */
class TechnicalIndicators {
  // Simple Moving Average
  static calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Exponential Moving Average
  static calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  // Relative Strength Index
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = [];
    let losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    if (gains.length < period) return null;
    
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // MACD (Moving Average Convergence Divergence)
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);
    
    if (!ema12 || !ema26) return null;
    
    const macdLine = ema12 - ema26;
    
    // For simplicity, we'll return the MACD line
    // In a full implementation, you'd calculate the signal line and histogram
    return {
      macd: macdLine,
      signal: null, // Would need historical MACD values for signal line
      histogram: null
    };
  }

  // Bollinger Bands
  static calculateBollingerBands(prices, period = 20, multiplier = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;
    
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (multiplier * stdDev),
      middle: sma,
      lower: sma - (multiplier * stdDev)
    };
  }
}

/**
 * Get real-time stock quote
 */
const getStockQuote = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    // Check if we have recent data in cache (less than 1 minute old)
    const cachedData = await StockData.findOne({
      symbol: symbol.toUpperCase(),
      timestamp: { $gte: new Date(Date.now() - 60000) } // 1 minute
    }).sort({ timestamp: -1 });

    if (cachedData) {
      return res.json({
        symbol: cachedData.symbol,
        price: cachedData.price,
        change: cachedData.change,
        changePercent: cachedData.changePercent,
        volume: cachedData.volume,
        timestamp: cachedData.timestamp,
        source: 'cache'
      });
    }

    // Fetch from Alpha Vantage API
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    
    if (!quote || !quote['05. price']) {
      return res.status(404).json({ error: 'Stock symbol not found' });
    }

    const stockData = {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      timestamp: new Date()
    };

    // Save to database
    await StockData.create(stockData);

    res.json({
      ...stockData,
      source: 'api'
    });

  } catch (error) {
    console.error('Error fetching stock quote:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
};

/**
 * Get historical stock data with technical indicators
 */
const getStockHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = 'daily', period = '1month' } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    // Map period to Alpha Vantage function
    let apiFunction;
    switch (interval) {
      case '1min':
        apiFunction = 'TIME_SERIES_INTRADAY';
        break;
      case '5min':
        apiFunction = 'TIME_SERIES_INTRADAY';
        break;
      case 'daily':
        apiFunction = 'TIME_SERIES_DAILY';
        break;
      case 'weekly':
        apiFunction = 'TIME_SERIES_WEEKLY';
        break;
      case 'monthly':
        apiFunction = 'TIME_SERIES_MONTHLY';
        break;
      default:
        apiFunction = 'TIME_SERIES_DAILY';
    }

    const params = {
      function: apiFunction,
      symbol: symbol.toUpperCase(),
      apikey: ALPHA_VANTAGE_API_KEY
    };

    if (apiFunction === 'TIME_SERIES_INTRADAY') {
      params.interval = interval;
    }

    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params,
      timeout: 15000
    });

    const data = response.data;
    let timeSeries;

    // Extract time series data based on function
    if (apiFunction === 'TIME_SERIES_INTRADAY') {
      timeSeries = data[`Time Series (${interval})`];
    } else if (apiFunction === 'TIME_SERIES_DAILY') {
      timeSeries = data['Time Series (Daily)'];
    } else if (apiFunction === 'TIME_SERIES_WEEKLY') {
      timeSeries = data['Weekly Time Series'];
    } else if (apiFunction === 'TIME_SERIES_MONTHLY') {
      timeSeries = data['Monthly Time Series'];
    }

    if (!timeSeries) {
      return res.status(404).json({ error: 'No data found for this symbol' });
    }

    // Convert to array and sort by date
    const historicalData = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate technical indicators
    const closePrices = historicalData.map(item => item.close);
    
    const indicators = {
      sma20: TechnicalIndicators.calculateSMA(closePrices, 20),
      sma50: TechnicalIndicators.calculateSMA(closePrices, 50),
      ema12: TechnicalIndicators.calculateEMA(closePrices, 12),
      ema26: TechnicalIndicators.calculateEMA(closePrices, 26),
      rsi: TechnicalIndicators.calculateRSI(closePrices),
      macd: TechnicalIndicators.calculateMACD(closePrices),
      bollingerBands: TechnicalIndicators.calculateBollingerBands(closePrices)
    };

    res.json({
      symbol: symbol.toUpperCase(),
      interval,
      data: historicalData,
      indicators,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching historical data:', error.message);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};

/**
 * Search for stock symbols
 */
const searchStocks = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords: query,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const matches = response.data.bestMatches || [];
    
    const results = matches.slice(0, 10).map(match => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency']
    }));

    res.json({
      query,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Error searching stocks:', error.message);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
};

/**
 * Get market overview
 */
const getMarketOverview = async (req, res) => {
  try {
    // Major market indices
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM']; // S&P 500, NASDAQ, Dow, Russell 2000
    const marketData = [];

    for (const symbol of indices) {
      try {
        const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol,
            apikey: ALPHA_VANTAGE_API_KEY
          },
          timeout: 5000
        });

        const quote = response.data['Global Quote'];
        if (quote && quote['05. price']) {
          marketData.push({
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
          });
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
      }
    }

    res.json({
      timestamp: new Date(),
      indices: marketData,
      status: 'success'
    });

  } catch (error) {
    console.error('Error fetching market overview:', error.message);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
};

module.exports = {
  getStockQuote,
  getStockHistory,
  searchStocks,
  getMarketOverview,
  TechnicalIndicators
};
