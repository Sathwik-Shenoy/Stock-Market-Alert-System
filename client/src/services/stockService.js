import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const stockAPI = axios.create({
  baseURL: `${API_BASE_URL}/stocks`,
  timeout: 15000,
});

// Add auth token to requests
stockAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
stockAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Stock Data Service
 */
class StockService {
  /**
   * Get real-time stock quote
   * @param {string} symbol - Stock symbol (e.g., 'AAPL')
   * @returns {Promise} Stock quote data
   */
  static async getQuote(symbol) {
    try {
      const response = await stockAPI.get(`/quote/${symbol.toUpperCase()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get historical stock data with technical indicators
   * @param {string} symbol - Stock symbol
   * @param {string} interval - Data interval ('1min', '5min', 'daily', 'weekly', 'monthly')
   * @param {string} period - Time period ('1day', '1week', '1month', '3months', '1year')
   * @returns {Promise} Historical data with technical indicators
   */
  static async getHistory(symbol, interval = 'daily', period = '1month') {
    try {
      const response = await stockAPI.get(`/history/${symbol.toUpperCase()}`, {
        params: { interval, period }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search for stock symbols
   * @param {string} query - Search query
   * @returns {Promise} Search results
   */
  static async searchStocks(query) {
    try {
      const response = await stockAPI.get('/search', {
        params: { query }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get market overview (major indices)
   * @returns {Promise} Market overview data
   */
  static async getMarketOverview() {
    try {
      const response = await stockAPI.get('/market-overview');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get multiple stock quotes
   * @param {string[]} symbols - Array of stock symbols
   * @returns {Promise} Array of stock quotes
   */
  static async getMultipleQuotes(symbols) {
    try {
      const promises = symbols.map(symbol => this.getQuote(symbol));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        symbol: symbols[index],
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Force refresh stock data (Premium feature)
   * @param {string} symbol - Stock symbol
   * @returns {Promise} Updated stock data
   */
  static async refreshStock(symbol) {
    try {
      const response = await stockAPI.post(`/refresh/${symbol.toUpperCase()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error object
   * @returns {Error} Formatted error
   */
  static handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 'An error occurred';
      const status = error.response.status;
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${message}`);
        case 401:
          return new Error('Unauthorized: Please log in again');
        case 403:
          return new Error('Forbidden: Insufficient permissions');
        case 404:
          return new Error('Stock symbol not found');
        case 408:
          return new Error('Request timeout: Please try again');
        case 429:
          return new Error('Rate limit exceeded: Please wait before making more requests');
        case 500:
          return new Error('Server error: Please try again later');
        default:
          return new Error(`Error ${status}: ${message}`);
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error: Please check your connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Format currency value
   * @param {number} value - Numeric value
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {string} Formatted currency string
   */
  static formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format percentage value
   * @param {number} value - Percentage value
   * @returns {string} Formatted percentage string
   */
  static formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Get color for price change
   * @param {number} change - Price change value
   * @returns {string} Color string ('green', 'red', or 'gray')
   */
  static getChangeColor(change) {
    if (change > 0) return 'success.main';
    if (change < 0) return 'error.main';
    return 'text.secondary';
  }

  /**
   * Check if market is open (simplified)
   * @returns {boolean} True if market is likely open
   */
  static isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    
    // Simple check: Monday-Friday, 9:30 AM - 4:00 PM ET
    // Note: This doesn't account for holidays or exact timezone conversion
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  }

  /**
   * Get watchlist from localStorage
   * @returns {string[]} Array of watched symbols
   */
  static getWatchlist() {
    try {
      const watchlist = localStorage.getItem('stockWatchlist');
      return watchlist ? JSON.parse(watchlist) : [];
    } catch (error) {
      console.error('Error loading watchlist:', error);
      return [];
    }
  }

  /**
   * Save watchlist to localStorage
   * @param {string[]} symbols - Array of stock symbols
   */
  static saveWatchlist(symbols) {
    try {
      localStorage.setItem('stockWatchlist', JSON.stringify(symbols));
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  }

  /**
   * Add symbol to watchlist
   * @param {string} symbol - Stock symbol to add
   */
  static addToWatchlist(symbol) {
    const watchlist = this.getWatchlist();
    const upperSymbol = symbol.toUpperCase();
    
    if (!watchlist.includes(upperSymbol)) {
      watchlist.push(upperSymbol);
      this.saveWatchlist(watchlist);
    }
  }

  /**
   * Remove symbol from watchlist
   * @param {string} symbol - Stock symbol to remove
   */
  static removeFromWatchlist(symbol) {
    const watchlist = this.getWatchlist();
    const upperSymbol = symbol.toUpperCase();
    const filteredWatchlist = watchlist.filter(s => s !== upperSymbol);
    
    this.saveWatchlist(filteredWatchlist);
  }
}

export default StockService;
