# Stock Market Alert System

A comprehensive MERN stack application for monitoring stock prices and sending automated alerts based on technical indicators.

## 🚀 Features

- **User Authentication**: JWT-based login/signup system
- **Real-time Stock Data**: Integration with Alpha Vantage/Finnhub API
- **Technical Indicators**: RSI, MACD, Moving Averages calculation
- **Smart Alerts**: Automated notifications based on technical analysis
- **Email Notifications**: Nodemailer integration for alert delivery
- **Interactive Dashboard**: React-based UI with real-time charts
- **Alert Management**: Configure and manage stock watchlists
- **Background Monitoring**: Scheduled price checks and alert triggers

## 🛠️ Tech Stack

- **Frontend**: React, Chart.js/Plotly.js, Axios, React Router
- **Backend**: Node.js, Express.js, JWT Authentication
- **Database**: MongoDB with Mongoose
- **APIs**: Alpha Vantage/Finnhub for stock data
- **Notifications**: Nodemailer for email alerts
- **Scheduling**: Node-cron for background monitoring

## 📦 Project Structure

```
stock-market-alert-system/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
├── server/                 # Express backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   └── server.js
├── package.json
└── README.md
```

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd stock-market-alert-system
   npm install
   ```

2. **Setup Environment Variables**
   - Copy `server/.env.example` to `server/.env` and fill values.
   - Copy `client/.env.example` to `client/.env` and update API URL if needed.

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Stock Data
- `GET /api/stocks/quote/:symbol` - Get real-time stock quote
- `GET /api/stocks/history/:symbol` - Get historical data with indicators (auth)
- `GET /api/stocks/search?query=...` - Search symbols
- `GET /api/stocks/market-overview` - Market overview indices
- `POST /api/stocks/refresh/:symbol` - Force refresh (premium only)

### Alerts
- `GET /api/alerts` - Get user alerts
- `GET /api/alerts/stats` - Get alert stats
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `PATCH /api/alerts/:id/toggle` - Toggle active/inactive
- `POST /api/alerts/:id/test` - Test alert condition
- `DELETE /api/alerts/:id` - Delete alert

## ✅ Production Readiness Notes

- Grid v2 migration warnings addressed.
- Alert create/test flows are API-contract aligned.
- Invalid alert IDs now return `400` instead of `500`.
- Client build compiles successfully.

## 🌐 Deployment Guide (Vercel + Render + MongoDB Atlas)

For complete step-by-step production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick Summary:**
- **Frontend**: Deploy `client/` to Vercel (https://stock.vercel.app)
- **Backend**: Deploy `server/` to Render (https://api.stock.com)
- **Database**: MongoDB Atlas (production URI configured)
- **Environment**: All production variables configured and secured

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup with custom domains, environment variables, and post-deployment verification.

## 📊 Technical Indicators

- **RSI (Relative Strength Index)**: Momentum oscillator (0-100)
- **MACD**: Moving Average Convergence Divergence
- **SMA/EMA**: Simple/Exponential Moving Averages
- **Custom Thresholds**: User-defined alert conditions

## 🔔 Alert Types

- **Overbought/Oversold**: RSI-based signals
- **MACD Crossover**: Bullish/bearish momentum changes
- **Price Targets**: Support/resistance level breaks
- **Volume Spikes**: Unusual trading activity

## 🌐 Deployment

- **Frontend**: Netlify, Vercel
- **Backend**: Render, Railway, Heroku
- **Database**: MongoDB Atlas

## 📝 License

MIT License - see LICENSE file for details
