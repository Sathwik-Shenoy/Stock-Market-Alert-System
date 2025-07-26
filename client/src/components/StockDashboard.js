import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Add,
  Remove,
  Refresh,
  Timeline,
  ShowChart
} from '@mui/icons-material';
import StockService from '../services/stockService';

const StockDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistData, setWatchlistData] = useState([]);
  const [marketOverview, setMarketOverview] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockHistory, setStockHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Load watchlist on component mount
  useEffect(() => {
    const savedWatchlist = StockService.getWatchlist();
    setWatchlist(savedWatchlist);
    
    if (savedWatchlist.length > 0) {
      loadWatchlistData(savedWatchlist);
    }
    
    loadMarketOverview();
  }, []);

  // Load watchlist data
  const loadWatchlistData = async (symbols) => {
    try {
      setLoading(true);
      const data = await StockService.getMultipleQuotes(symbols);
      setWatchlistData(data.filter(item => item.data !== null));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load market overview
  const loadMarketOverview = async () => {
    try {
      const data = await StockService.getMarketOverview();
      setMarketOverview(data);
    } catch (error) {
      console.error('Failed to load market overview:', error);
    }
  };

  // Search stocks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      setError('');
      const results = await StockService.searchStocks(searchQuery);
      setSearchResults(results.results || []);
    } catch (error) {
      setError(error.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add to watchlist
  const addToWatchlist = (symbol) => {
    StockService.addToWatchlist(symbol);
    const newWatchlist = StockService.getWatchlist();
    setWatchlist(newWatchlist);
    loadWatchlistData(newWatchlist);
  };

  // Remove from watchlist
  const removeFromWatchlist = (symbol) => {
    StockService.removeFromWatchlist(symbol);
    const newWatchlist = StockService.getWatchlist();
    setWatchlist(newWatchlist);
    setWatchlistData(prev => prev.filter(item => item.symbol !== symbol));
  };

  // Load stock details
  const loadStockDetails = async (symbol) => {
    try {
      setLoading(true);
      const [quote, history] = await Promise.all([
        StockService.getQuote(symbol),
        StockService.getHistory(symbol, 'daily', '1month')
      ]);
      
      setSelectedStock(quote);
      setStockHistory(history);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh watchlist
  const refreshWatchlist = () => {
    if (watchlist.length > 0) {
      loadWatchlistData(watchlist);
    }
    loadMarketOverview();
  };

  const formatCurrency = (value) => StockService.formatCurrency(value);
  const formatPercentage = (value) => StockService.formatPercentage(value);
  const getChangeColor = (change) => StockService.getChangeColor(change);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        📈 Stock Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Market Overview */}
      {marketOverview && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Market Overview</Typography>
              <IconButton onClick={refreshWatchlist} size="small">
                <Refresh />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              {marketOverview.indices?.map((index) => (
                <Grid item xs={12} sm={6} md={3} key={index.symbol}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{index.symbol}</Typography>
                    <Typography variant="h5" sx={{ color: getChangeColor(index.change) }}>
                      {formatCurrency(index.price)}
                    </Typography>
                    <Box display="flex" alignItems="center" justifyContent="center">
                      {index.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                      <Typography 
                        variant="body2" 
                        sx={{ color: getChangeColor(index.change), ml: 0.5 }}
                      >
                        {formatPercentage(index.changePercent)}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Search & Watchlist */}
        <Grid item xs={12} md={4}>
          {/* Stock Search */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search Stocks
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <TextField
                  fullWidth
                  placeholder="Enter stock symbol or company name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  variant="contained" 
                  onClick={handleSearch}
                  disabled={searchLoading}
                  startIcon={searchLoading ? <CircularProgress size={20} /> : <Search />}
                >
                  Search
                </Button>
              </Box>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <List dense>
                  {searchResults.map((stock) => (
                    <ListItem key={stock.symbol} divider>
                      <ListItemText
                        primary={`${stock.symbol} - ${stock.name}`}
                        secondary={`${stock.type} • ${stock.region}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => addToWatchlist(stock.symbol)}
                          disabled={watchlist.includes(stock.symbol)}
                          size="small"
                        >
                          <Add />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Watchlist */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">My Watchlist</Typography>
                <IconButton onClick={refreshWatchlist} size="small" disabled={loading}>
                  <Refresh />
                </IconButton>
              </Box>

              {loading && (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress />
                </Box>
              )}

              {!loading && watchlistData.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No stocks in watchlist. Search and add stocks to get started.
                </Typography>
              )}

              {!loading && watchlistData.length > 0 && (
                <List dense>
                  {watchlistData.map((item) => (
                    <ListItem 
                      key={item.symbol} 
                      divider
                      button
                      onClick={() => loadStockDetails(item.symbol)}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">{item.symbol}</Typography>
                            <Typography variant="subtitle2">
                              {formatCurrency(item.data.price)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="caption">
                              Vol: {item.data.volume?.toLocaleString()}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ color: getChangeColor(item.data.change) }}
                            >
                              {formatPercentage(item.data.changePercent)}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWatchlist(item.symbol);
                          }}
                          size="small"
                        >
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Stock Details */}
        <Grid item xs={12} md={8}>
          {selectedStock ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Typography variant="h5">{selectedStock.symbol}</Typography>
                  <Chip 
                    label={selectedStock.source === 'cache' ? 'Cached' : 'Live'}
                    color={selectedStock.source === 'cache' ? 'default' : 'success'}
                    size="small"
                  />
                </Box>

                {/* Price Information */}
                <Grid container spacing={3} mb={3}>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h3" sx={{ color: getChangeColor(selectedStock.change) }}>
                        {formatCurrency(selectedStock.price)}
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        {selectedStock.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                        <Typography 
                          variant="h6" 
                          sx={{ color: getChangeColor(selectedStock.change), ml: 1 }}
                        >
                          {formatCurrency(selectedStock.change)} ({formatPercentage(selectedStock.changePercent)})
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Volume</Typography>
                      <Typography variant="h5">{selectedStock.volume?.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last Updated: {new Date(selectedStock.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Technical Indicators */}
                {stockHistory?.indicators && (
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Technical Indicators</Typography>
                    <Grid container spacing={2}>
                      {stockHistory.indicators.rsi && (
                        <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary">RSI (14)</Typography>
                          <Typography variant="h6">
                            {stockHistory.indicators.rsi.toFixed(2)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.sma20 && (
                        <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary">SMA 20</Typography>
                          <Typography variant="h6">
                            {formatCurrency(stockHistory.indicators.sma20)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.sma50 && (
                        <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary">SMA 50</Typography>
                          <Typography variant="h6">
                            {formatCurrency(stockHistory.indicators.sma50)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.bollingerBands && (
                        <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary">Bollinger Upper</Typography>
                          <Typography variant="h6">
                            {formatCurrency(stockHistory.indicators.bollingerBands.upper)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                )}

                {/* Historical Data Preview */}
                {stockHistory?.data && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Recent Price History</Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {stockHistory.data.slice(-10).reverse().map((item, index) => (
                        <Box key={index} display="flex" justifyContent="space-between" py={1}>
                          <Typography variant="body2">
                            {new Date(item.date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2">
                            {formatCurrency(item.close)}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ color: getChangeColor(item.close - item.open) }}
                          >
                            {formatPercentage(((item.close - item.open) / item.open) * 100)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center"
                  py={8}
                >
                  <ShowChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" textAlign="center">
                    Select a stock from your watchlist to view detailed information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                    Search for stocks and add them to your watchlist to get started
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default StockDashboard;
