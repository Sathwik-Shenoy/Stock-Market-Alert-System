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
   ```bash
   # Create .env file in server/ directory
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

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
- `GET /api/stocks/:symbol` - Get stock data with indicators
- `GET /api/stocks/:symbol/history` - Get historical data

### Alerts
- `GET /api/alerts` - Get user alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

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
