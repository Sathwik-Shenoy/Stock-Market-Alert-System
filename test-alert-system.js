const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

let authToken = '';

/**
 * Alert System Integration Test
 * Tests the complete alert workflow from creation to monitoring
 */

async function runAlertSystemTest() {
  console.log('🧪 Starting Alert System Integration Test\n');

  try {
    // 1. Test user registration/login
    await testAuthentication();

    // 2. Test alert creation
    const alertId = await testAlertCreation();

    // 3. Test alert listing
    await testAlertListing();

    // 4. Test alert monitoring
    await testAlertMonitoring(alertId);

    // 5. Test alert modification
    await testAlertModification(alertId);

    // 6. Test alert deletion
    await testAlertDeletion(alertId);

    // 7. Test alert monitor admin endpoints
    await testAlertMonitorAdmin();

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

async function testAuthentication() {
  console.log('1️⃣ Testing Authentication...');

  try {
    // Try to register user (might fail if already exists)
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
      console.log('   ✅ User registered');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('   ℹ️  User already exists, proceeding with login');
      } else {
        throw error;
      }
    }

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    authToken = loginResponse.data.data.accessToken;
    console.log('   ✅ User logged in successfully');
    console.log('   🔑 Token received:', authToken ? 'Yes' : 'No');

  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

async function testAlertCreation() {
  console.log('2️⃣ Testing Alert Creation...');

  const alertData = {
    symbol: 'AAPL',
    alertType: 'price',
    condition: 'above',
    targetValue: 150,
    description: 'AAPL above $150 test alert',
    emailNotification: true
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/alerts`, alertData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const alert = response.data.data;
    console.log(`   ✅ Alert created with ID: ${alert._id}`);
    console.log(`   📊 Alert: ${alert.description}`);

    return alert._id;

  } catch (error) {
    throw new Error(`Alert creation failed: ${error.message}`);
  }
}

async function testAlertListing() {
  console.log('3️⃣ Testing Alert Listing...');

  try {
    const response = await axios.get(`${BASE_URL}/api/alerts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const alerts = response.data.data;
    console.log(`   ✅ Retrieved ${alerts.length} alerts`);

    if (alerts.length > 0) {
      console.log(`   📋 First alert: ${alerts[0].description}`);
    }

  } catch (error) {
    throw new Error(`Alert listing failed: ${error.message}`);
  }
}

async function testAlertMonitoring(alertId) {
  console.log('4️⃣ Testing Alert Monitoring...');

  try {
    // Test individual alert
    const response = await axios.post(`${BASE_URL}/api/admin/alert-monitor/check`, {
      alertId: alertId
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('   ✅ Manual alert check completed');
    console.log(`   📝 ${response.data.message}`);

  } catch (error) {
    throw new Error(`Alert monitoring test failed: ${error.message}`);
  }
}

async function testAlertModification(alertId) {
  console.log('5️⃣ Testing Alert Modification...');

  try {
    // Update alert
    const updateData = {
      targetValue: 155,
      description: 'AAPL above $155 updated test alert'
    };

    const response = await axios.put(`${BASE_URL}/api/alerts/${alertId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('   ✅ Alert updated successfully');
    console.log(`   📝 New description: ${response.data.data.description}`);

    // Toggle alert
    await axios.patch(`${BASE_URL}/api/alerts/${alertId}/toggle`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('   ✅ Alert toggled successfully');

  } catch (error) {
    throw new Error(`Alert modification failed: ${error.message}`);
  }
}

async function testAlertDeletion(alertId) {
  console.log('6️⃣ Testing Alert Deletion...');

  try {
    await axios.delete(`${BASE_URL}/api/alerts/${alertId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('   ✅ Alert deleted successfully');

  } catch (error) {
    throw new Error(`Alert deletion failed: ${error.message}`);
  }
}

async function testAlertMonitorAdmin() {
  console.log('7️⃣ Testing Alert Monitor Admin...');

  try {
    // Get status
    const statusResponse = await axios.get(`${BASE_URL}/api/admin/alert-monitor/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('   ✅ Monitor status retrieved');
    console.log(`   📊 Is running: ${statusResponse.data.data.isRunning}`);

    // Test manual check all
    const checkResponse = await axios.post(`${BASE_URL}/api/admin/alert-monitor/check`, {}, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   ✅ Manual check all completed');

  } catch (error) {
    throw new Error(`Alert monitor admin test failed: ${error.message}`);
  }
}

async function testStockData() {
  console.log('8️⃣ Testing Stock Data Integration...');

  try {
    const response = await axios.get(`${BASE_URL}/api/stocks/quote/AAPL`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const quote = response.data.data;
    console.log('   ✅ Stock data retrieved');
    console.log(`   💰 AAPL Price: $${quote.price}`);
    console.log(`   📈 Change: ${quote.changePercent}%`);

  } catch (error) {
    throw new Error(`Stock data test failed: ${error.message}`);
  }
}

// Health check
async function testHealthCheck() {
  console.log('🏥 Testing Health Check...');

  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Server is healthy');
    console.log(`   ⏱️  Uptime: ${Math.floor(response.data.uptime)}s`);

  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
}

// Run tests
if (require.main === module) {
  // Check if server is running first
  testHealthCheck()
    .then(() => runAlertSystemTest())
    .catch(error => {
      console.error('\n❌ Test suite failed to start:', error.message);
      console.log('\n💡 Make sure the server is running with: npm run dev');
    });
}

module.exports = {
  runAlertSystemTest,
  testHealthCheck
};
