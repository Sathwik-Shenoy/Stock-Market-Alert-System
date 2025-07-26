const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken, checkSubscription } = require('../middleware/auth');

// Import controllers
const { 
  getStockQuote, 
  getStockHistory, 
  searchStocks, 
  getMarketOverview 
} = require('../controllers/stockController');

// @route   GET /api/stocks/quote/:symbol
// @desc    Get real-time stock quote
// @access  Private
router.get('/quote/:symbol', authenticateToken, getStockQuote);

// @route   GET /api/stocks/history/:symbol
// @desc    Get historical stock data with technical indicators
// @access  Private
router.get('/history/:symbol', authenticateToken, getStockHistory);

// @route   GET /api/stocks/search
// @desc    Search for stock symbols
// @access  Private
router.get('/search', authenticateToken, searchStocks);

// @route   GET /api/stocks/market-overview
// @desc    Get market overview (major indices)
// @access  Private
router.get('/market-overview', authenticateToken, getMarketOverview);

// @route   POST /api/stocks/refresh/:symbol
// @desc    Force refresh stock data
// @access  Private (Premium feature)
router.post('/refresh/:symbol', authenticateToken, checkSubscription('premium'), getStockQuote);

module.exports = router;
