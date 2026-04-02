import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Add,
  Remove,
  Refresh,
  ShowChart,
  Insights
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StockService from '../services/stockService';
import toast from 'react-hot-toast';

const calculateEMA = (prices, period) => {
  if (prices.length < period) return [];

  const seed = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  const multiplier = 2 / (period + 1);
  const ema = Array(period - 1).fill(null);
  ema.push(seed);

  for (let i = period; i < prices.length; i += 1) {
    const previous = ema[i - 1] ?? seed;
    ema.push((prices[i] - previous) * multiplier + previous);
  }

  return ema;
};

const detectMacdCrossover = (historyData) => {
  if (!historyData || historyData.length < 35) return null;

  const closes = historyData.map((item) => item.close);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdSeries = closes
    .map((_, index) => {
      if (ema12[index] == null || ema26[index] == null) return null;
      return ema12[index] - ema26[index];
    })
    .filter((value) => value != null);

  if (macdSeries.length < 2) return null;

  const previous = macdSeries[macdSeries.length - 2];
  const current = macdSeries[macdSeries.length - 1];

  if (previous <= 0 && current > 0) return 'bullish';
  if (previous >= 0 && current < 0) return 'bearish';
  return null;
};

const deriveIndicatorSignals = (historyPayload) => {
  if (!historyPayload?.indicators || !historyPayload?.data?.length) {
    return {
      rsi: null,
      smaSignal: null,
      macdCrossover: null
    };
  }

  const { indicators, data } = historyPayload;
  const lastClose = data[data.length - 1]?.close;
  let smaSignal = null;

  if (lastClose && indicators.sma20) {
    smaSignal = lastClose >= indicators.sma20 ? 'bullish' : 'bearish';
  }

  return {
    rsi: indicators.rsi,
    smaSignal,
    macdCrossover: detectMacdCrossover(data)
  };
};

const StockDashboard = () => {
  const navigate = useNavigate();
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
  const [role, setRole] = useState(() => localStorage.getItem('dashboardRole') || 'viewer');
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState('all');
  const [viewCounts, setViewCounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stockViewCounts') || '{}');
    } catch (readError) {
      return {};
    }
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    localStorage.setItem('dashboardRole', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('stockViewCounts', JSON.stringify(viewCounts));
  }, [viewCounts]);

  // Load watchlist data
  const loadWatchlistData = useCallback(async (symbols) => {
    try {
      setLoading(true);
      const quoteData = await StockService.getMultipleQuotes(symbols);
      const validQuotes = quoteData.filter((item) => item.data !== null);

      const historyResults = await Promise.allSettled(
        validQuotes.map((item) => StockService.getHistory(item.symbol, 'daily', '3months'))
      );

      const merged = validQuotes.map((item, index) => {
        const history = historyResults[index].status === 'fulfilled' ? historyResults[index].value : null;
        return {
          ...item,
          signals: deriveIndicatorSignals(history)
        };
      });

      setWatchlistData(merged);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load market overview
  const loadMarketOverview = useCallback(async () => {
    try {
      const data = await StockService.getMarketOverview();
      setMarketOverview(data);
    } catch (error) {
      console.error('Failed to load market overview:', error);
    }
  }, []);

  // Load watchlist on component mount
  useEffect(() => {
    const savedWatchlist = StockService.getWatchlist();
    setWatchlist(savedWatchlist);

    if (savedWatchlist.length > 0) {
      loadWatchlistData(savedWatchlist);
    }

    loadMarketOverview();
  }, [loadWatchlistData, loadMarketOverview]);

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
    if (!isAdmin) {
      toast.error('Viewer mode is read-only. Switch to Admin to update watchlist.');
      return;
    }

    StockService.addToWatchlist(symbol);
    const newWatchlist = StockService.getWatchlist();
    setWatchlist(newWatchlist);
    loadWatchlistData(newWatchlist);
    
    // Show success message
    toast.success(`${symbol} added to watchlist!`);
  };

  // Remove from watchlist
  const removeFromWatchlist = (symbol) => {
    if (!isAdmin) {
      toast.error('Viewer mode is read-only. Switch to Admin to update watchlist.');
      return;
    }

    StockService.removeFromWatchlist(symbol);
    const newWatchlist = StockService.getWatchlist();
    setWatchlist(newWatchlist);
    setWatchlistData(prev => prev.filter(item => item.symbol !== symbol));
    
    // Show success message
    toast.success(`${symbol} removed from watchlist!`);
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
      setViewCounts((previous) => ({
        ...previous,
        [symbol]: (previous[symbol] || 0) + 1
      }));
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

  const filteredWatchlistData = useMemo(() => {
    let data = [...watchlistData];

    if (watchlistSearch.trim()) {
      const query = watchlistSearch.trim().toLowerCase();
      data = data.filter((item) => item.symbol.toLowerCase().includes(query));
    }

    if (indicatorFilter === 'rsi') {
      data = data.filter((item) => {
        const value = item.signals?.rsi;
        return value != null && (value >= 70 || value <= 30);
      });
    }

    if (indicatorFilter === 'macd') {
      data = data.filter((item) => item.signals?.macdCrossover);
    }

    if (indicatorFilter === 'sma') {
      data = data.filter((item) => item.signals?.smaSignal);
    }

    return data;
  }, [watchlistData, watchlistSearch, indicatorFilter]);

  const insights = useMemo(() => {
    const topViewed = Object.entries(viewCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const highRsi = watchlistData
      .filter((item) => item.signals?.rsi != null && (item.signals.rsi >= 70 || item.signals.rsi <= 30))
      .sort((a, b) => (b.signals?.rsi || 0) - (a.signals?.rsi || 0))
      .slice(0, 3);

    const macdCrossovers = watchlistData
      .filter((item) => item.signals?.macdCrossover)
      .map((item) => ({
        symbol: item.symbol,
        signal: item.signals.macdCrossover
      }));

    return {
      topViewed,
      highRsi,
      macdCrossovers
    };
  }, [viewCounts, watchlistData]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
        mb={2}
      >
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          📈 Stock Dashboard
        </Typography>
        <Box display="flex" gap={1.5} flexWrap="wrap" flexDirection={{ xs: 'column', sm: 'row' }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              label="Role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
              <MenuItem value="admin">Admin (Manage)</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => navigate('/alerts')}
            disabled={!isAdmin}
            fullWidth
            sx={{ whiteSpace: 'nowrap' }}
          >
            + Create New Alert
          </Button>
        </Box>
      </Box>

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
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index.symbol}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Stock Search */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Search Stocks
              </Typography>
              <Box display="flex" gap={1} mb={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                <TextField
                  fullWidth
                  placeholder="Enter stock symbol or company name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  size="small"
                />
                <Button 
                  variant="contained" 
                  onClick={handleSearch}
                  disabled={searchLoading}
                  startIcon={searchLoading ? <CircularProgress size={20} /> : <Search />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Search
                </Button>
              </Box>

              {!isAdmin && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Viewer mode enabled. You can explore data but cannot modify watchlist or alerts.
                </Alert>
              )}

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
                          disabled={watchlist.includes(stock.symbol.toUpperCase()) || !isAdmin}
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
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} gap={1} flexWrap="wrap">
                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>My Watchlist</Typography>
                <IconButton onClick={refreshWatchlist} size="small" disabled={loading}>
                  <Refresh />
                </IconButton>
              </Box>

              <Box display="flex" gap={1} mb={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  placeholder="Filter by symbol"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 145 } }}>
                  <InputLabel id="indicator-filter-label">Indicator</InputLabel>
                  <Select
                    labelId="indicator-filter-label"
                    label="Indicator"
                    value={indicatorFilter}
                    onChange={(e) => setIndicatorFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="rsi">RSI Alerts</MenuItem>
                    <MenuItem value="macd">MACD Crossovers</MenuItem>
                    <MenuItem value="sma">SMA Signals</MenuItem>
                  </Select>
                </FormControl>
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
                  {filteredWatchlistData.map((item) => (
                    <ListItem key={item.symbol} divider disablePadding>
                      <ListItemButton onClick={() => loadStockDetails(item.symbol)}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle2">{item.symbol}</Typography>
                              <Typography variant="subtitle2">
                                {formatCurrency(item.data.price)}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Box>
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
                              <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                                {item.signals?.rsi != null && (
                                  <Chip
                                    label={`RSI ${item.signals.rsi.toFixed(1)}`}
                                    size="small"
                                    color={item.signals.rsi >= 70 || item.signals.rsi <= 30 ? 'warning' : 'default'}
                                  />
                                )}
                                {item.signals?.macdCrossover && (
                                  <Chip
                                    label={`MACD ${item.signals.macdCrossover}`}
                                    size="small"
                                    color={item.signals.macdCrossover === 'bullish' ? 'success' : 'error'}
                                  />
                                )}
                                {item.signals?.smaSignal && (
                                  <Chip
                                    label={`SMA ${item.signals.smaSignal}`}
                                    size="small"
                                    color={item.signals.smaSignal === 'bullish' ? 'success' : 'error'}
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWatchlist(item.symbol);
                          }}
                          disabled={!isAdmin}
                          size="small"
                        >
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              {!loading && watchlistData.length > 0 && filteredWatchlistData.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No symbols match the current search/filter.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Insights + Stock Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Insights color="primary" />
                <Typography variant="h6">Insights</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, minHeight: 140 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Most Viewed Stocks
                    </Typography>
                    {insights.topViewed.length > 0 ? insights.topViewed.map(([symbol, views]) => (
                      <Typography key={symbol} variant="body2" sx={{ mb: 0.5 }}>
                        {symbol}: {views} views
                      </Typography>
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        No view history yet.
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, minHeight: 140 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Highest RSI Alert Stocks
                    </Typography>
                    {insights.highRsi.length > 0 ? insights.highRsi.map((item) => (
                      <Typography key={item.symbol} variant="body2" sx={{ mb: 0.5 }}>
                        {item.symbol}: RSI {item.signals.rsi.toFixed(1)}
                      </Typography>
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        No RSI extremes currently.
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, minHeight: 140 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      MACD Crossovers Detected
                    </Typography>
                    {insights.macdCrossovers.length > 0 ? insights.macdCrossovers.map((item) => (
                      <Typography key={item.symbol} variant="body2" sx={{ mb: 0.5 }}>
                        {item.symbol}: {item.signal}
                      </Typography>
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        No fresh MACD crossovers.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

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
                  <Grid size={{ xs: 12, sm: 6 }}>
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
                  <Grid size={{ xs: 12, sm: 6 }}>
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
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">RSI (14)</Typography>
                          <Typography variant="h6">
                            {stockHistory.indicators.rsi.toFixed(2)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.sma20 && (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">SMA 20</Typography>
                          <Typography variant="h6">
                            {formatCurrency(stockHistory.indicators.sma20)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.sma50 && (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">SMA 50</Typography>
                          <Typography variant="h6">
                            {formatCurrency(stockHistory.indicators.sma50)}
                          </Typography>
                        </Grid>
                      )}
                      {stockHistory.indicators.bollingerBands && (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
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
