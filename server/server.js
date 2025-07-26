const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const alertRoutes = require('./routes/alerts');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import background services
// const alertMonitor = require('./utils/alertMonitor');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stock-alert-db')
.then(() => {
  console.log('✅ Connected to MongoDB');
  // Start background alert monitoring after DB connection
  // alertMonitor.startMonitoring();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Stock Alert System API is ready!`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Admin endpoint for alert monitor control
app.get('/api/admin/alert-monitor/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: false,
      message: 'Alert monitor temporarily disabled during development'
    }
  });
});

app.post('/api/admin/alert-monitor/start', (req, res) => {
  res.json({
    success: true,
    message: 'Alert monitoring would start here (currently disabled)'
  });
});

app.post('/api/admin/alert-monitor/stop', (req, res) => {
  res.json({
    success: true,
    message: 'Alert monitoring would stop here (currently disabled)'
  });
});

app.post('/api/admin/alert-monitor/check', async (req, res) => {
  try {
    const { alertId } = req.body;
    res.json({
      success: true,
      message: alertId ? `Manual check would be performed for alert ${alertId} (currently disabled)` : 'Manual check would be performed for all alerts (currently disabled)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // alertMonitor.stopMonitoring();
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  // alertMonitor.stopMonitoring();
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
