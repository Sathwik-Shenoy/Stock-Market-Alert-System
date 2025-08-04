const axios = require('axios');
const StockData = require('../models/StockData');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Backend Stock Service for Alert Monitoring
 */
class StockService {
  /**
   * Get stock quote for alert monitoring
   * @param {string} symbol - Stock symbol
   * @returns {Promise} Stock quote data
   */
  static async getQuote(symbol) {
    try {
      // Check cache first (data less than 5 minutes old for monitoring)
      const cachedData = await StockData.findOne({
        symbol: symbol.toUpperCase(),
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
      }).sort({ timestamp: -1 });

      if (cachedData) {
        return {
          symbol: cachedData.symbol,
          price: cachedData.price,
          change: cachedData.change,
          changePercent: cachedData.changePercent,
          volume: cachedData.volume,
          timestamp: cachedData.timestamp,
          source: 'cache'
        };
      }

      // Fetch from Finnhub API (Primary)
      try {
        const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
          params: {
            symbol: symbol.toUpperCase(),
            token: FINNHUB_API_KEY
          },
          timeout: 10000
        });

        const quote = response.data;
        
        if (!quote.c || quote.c === 0) {
          throw new Error(`No data found for symbol ${symbol} from Finnhub`);
        }

        const stockData = {
          symbol: symbol.toUpperCase(),
          price: parseFloat(quote.c), // current price
          change: parseFloat(quote.d), // change
          changePercent: parseFloat(quote.dp), // change percent
          volume: 0, // Finnhub doesn't provide volume in quote endpoint
          timestamp: new Date(quote.t * 1000), // convert unix timestamp
          source: 'finnhub'
        };

        // Save to cache
        await StockData.create(stockData);

        return {
          ...stockData,
          source: 'finnhub'
        };

      } catch (finnhubError) {
        console.log(`Finnhub API failed for ${symbol}, trying Alpha Vantage fallback:`, finnhubError.message);
        
        // Fallback to Alpha Vantage
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
          throw new Error(`No data found for symbol ${symbol} from both APIs`);
        }

        const stockData = {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          timestamp: new Date(),
          source: 'alpha_vantage'
        };

        // Save to cache
        await StockData.create(stockData);

        return {
          ...stockData,
          source: 'alpha_vantage_fallback'
        };
      }

    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get historical data for technical indicators
   * @param {string} symbol - Stock symbol
   * @param {string} interval - Data interval
   * @returns {Promise} Historical data
   */
  static async getHistory(symbol, interval = 'daily') {
    try {
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          apikey: ALPHA_VANTAGE_API_KEY
        },
        timeout: 15000
      });

      const timeSeries = response.data['Time Series (Daily)'];
      
      if (!timeSeries) {
        throw new Error(`No historical data found for symbol ${symbol}`);
      }

      // Convert to array and sort by date
      const data = Object.entries(timeSeries)
        .map(([date, values]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return { symbol: symbol.toUpperCase(), data };

    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get multiple quotes efficiently
   * @param {string[]} symbols - Array of stock symbols
   * @returns {Promise} Array of quotes
   */
  static async getMultipleQuotes(symbols) {
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getQuote(symbol);
        return { symbol, quote, error: null };
      } catch (error) {
        return { symbol, quote: null, error: error.message };
      }
    });

    return await Promise.all(promises);
  }

  /**
   * Calculate technical indicators for a given stock
   * @param {string} symbol - Stock symbol
   * @param {string} indicator - Indicator type
   * @param {number} period - Period for calculation
   * @returns {Promise} Indicator value
   */
  static async calculateIndicator(symbol, indicator, period = 14) {
    try {
      const { data } = await this.getHistory(symbol);
      const closePrices = data.map(item => item.close);

      switch (indicator) {
        case 'rsi':
          return this.calculateRSI(closePrices, period);
        case 'sma':
          return this.calculateSMA(closePrices, period);
        case 'ema':
          return this.calculateEMA(closePrices, period);
        case 'macd':
          return this.calculateMACD(closePrices);
        default:
          throw new Error(`Unsupported indicator: ${indicator}`);
      }
    } catch (error) {
      console.error(`Error calculating ${indicator} for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Technical Indicator Calculations
  static calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  static calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

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

  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    
    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);
    
    if (!ema12 || !ema26) return null;
    
    return ema12 - ema26;
  }
}

module.exports = StockService;
