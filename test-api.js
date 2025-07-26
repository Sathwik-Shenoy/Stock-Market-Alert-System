const axios = require('axios');

// Test the Alpha Vantage API directly
async function testAlphaVantageAPI() {
  try {
    console.log('🧪 Testing Alpha Vantage API...');
    
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'IBM',
        apikey: 'demo'
      }
    });
    
    console.log('✅ Alpha Vantage API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Test our stock controller logic
    const quote = response.data['Global Quote'];
    if (quote && quote['05. price']) {
      const stockData = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        timestamp: new Date()
      };
      
      console.log('✅ Parsed Stock Data:');
      console.log(stockData);
    }
    
  } catch (error) {
    console.error('❌ Error testing Alpha Vantage API:', error.message);
  }
}

// Test our local API endpoints (after authentication)
async function testLocalAPI() {
  try {
    console.log('\n🧪 Testing Local API Health Check...');
    
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health Check Response:');
    console.log(healthResponse.data);
    
  } catch (error) {
    console.error('❌ Error testing local API:', error.message);
  }
}

// Run tests
async function runTests() {
  await testAlphaVantageAPI();
  await testLocalAPI();
}

runTests();
