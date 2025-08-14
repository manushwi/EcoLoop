const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';
const TEST_NAME = 'Test User';

// Test functions
async function testAuthEndpoints() {
  console.log('🧪 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Check auth status (should be unauthenticated)
    console.log('1. Testing /api/auth/status (unauthenticated)...');
    const statusResponse = await axios.get(`${BASE_URL}/api/auth/status`);
    console.log('✅ Status check successful:', statusResponse.data);
    console.log('');

    // Test 2: Test signup endpoint
    console.log('2. Testing /api/auth/signup...');
    try {
      const signupResponse = await axios.post(`${BASE_URL}/api/auth/signup`, {
        name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      console.log('✅ Signup successful:', signupResponse.data);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
        console.log('ℹ️ User already exists (expected for repeated tests)');
      } else {
        console.log('❌ Signup failed:', error.response?.data || error.message);
      }
    }
    console.log('');

    // Test 3: Test login endpoint
    console.log('3. Testing /api/auth/login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      console.log('✅ Login successful:', loginResponse.data);
      
      // Get cookies from login response
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        console.log('🍪 Session cookies received');
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 4: Test Google OAuth endpoint
    console.log('4. Testing /api/auth/google...');
    try {
      const googleResponse = await axios.get(`${BASE_URL}/api/auth/google`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 // Expect redirect
      });
      console.log('✅ Google OAuth redirect successful');
    } catch (error) {
      if (error.response?.status === 302) {
        console.log('✅ Google OAuth redirect successful (302 status)');
      } else {
        console.log('❌ Google OAuth failed:', error.message);
      }
    }
    console.log('');

    console.log('🎉 Authentication endpoint tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Set up Google OAuth credentials in .env file');
    console.log('2. Test the full OAuth flow manually');
    console.log('3. Verify session management works correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your server is running on port 3000');
      console.log('   Run: npm run dev');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuthEndpoints();
}

module.exports = { testAuthEndpoints };
