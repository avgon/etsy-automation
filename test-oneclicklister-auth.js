const axios = require('axios');
const logger = require('./src/utils/logger');

async function testOneClickListerAuth() {
  try {
    console.log('🔐 Testing OneClickLister Authentication Methods...\n');

    const clientId = process.env.ONECLICKLISTER_API_KEY;
    const clientSecret = process.env.ONECLICKLISTER_API_SECRET;

    if (!clientId || !clientSecret) {
      console.log('❌ Missing OneClickLister credentials');
      return;
    }

    console.log('🔑 Credentials Found:');
    console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
    console.log(`   Client Secret: ${clientSecret.substring(0, 8)}...\n`);

    // Test different possible base URLs and endpoints
    const testUrls = [
      'https://oneclicklister.com/api',
      'https://api.oneclicklister.com',
      'https://oneclicklister.com/oauth',
      'https://oneclicklister.com/v1',
      'https://app.oneclicklister.com/api'
    ];

    const authEndpoints = [
      '/oauth/token',
      '/auth/token',
      '/token',
      '/api/oauth/token',
      '/api/auth/token'
    ];

    console.log('🌐 Testing Different Base URLs and Endpoints...\n');

    for (const baseUrl of testUrls) {
      console.log(`📡 Testing Base URL: ${baseUrl}`);
      
      for (const endpoint of authEndpoints) {
        const fullUrl = `${baseUrl}${endpoint}`;
        console.log(`   🔗 Testing: ${fullUrl}`);
        
        try {
          // Test different authentication methods
          const authMethods = [
            // OAuth 2.0 Client Credentials
            {
              name: 'OAuth 2.0 Client Credentials',
              data: {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'read write'
              },
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            },
            // Form-encoded OAuth
            {
              name: 'Form-encoded OAuth',
              data: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'read write'
              }),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              }
            },
            // Basic Auth
            {
              name: 'Basic Auth',
              data: {
                grant_type: 'client_credentials'
              },
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
              }
            }
          ];

          for (const method of authMethods) {
            try {
              const response = await axios.post(fullUrl, method.data, {
                headers: method.headers,
                timeout: 5000
              });

              console.log(`   ✅ ${method.name}: SUCCESS`);
              console.log(`      Status: ${response.status}`);
              console.log(`      Response:`, response.data);
              
              if (response.data.access_token) {
                logger.info('OneClickLister authentication successful', {
                  method: method.name,
                  url: fullUrl,
                  tokenType: response.data.token_type
                });
                
                // Test a simple API call with the token
                await testApiCall(baseUrl, response.data.access_token);
                return; // Exit on first success
              }
              
            } catch (error) {
              const status = error.response?.status;
              const statusText = error.response?.statusText;
              const errorData = error.response?.data;
              
              if (status === 401) {
                console.log(`   ⚠️ ${method.name}: 401 Unauthorized (wrong credentials?)`);
              } else if (status === 404) {
                console.log(`   ❌ ${method.name}: 404 Not Found`);
              } else if (status === 405) {
                console.log(`   ❌ ${method.name}: 405 Method Not Allowed`);
              } else if (status >= 400 && status < 500) {
                console.log(`   ⚠️ ${method.name}: ${status} ${statusText}`);
                if (errorData) {
                  console.log(`      Error:`, errorData);
                }
              } else {
                console.log(`   ❌ ${method.name}: ${error.code || error.message}`);
              }
            }
          }
        } catch (error) {
          console.log(`   ❌ Connection failed: ${error.code || error.message}`);
        }
        
        console.log(''); // Empty line for readability
      }
      
      console.log(''); // Empty line between base URLs
    }

    console.log('🔍 Testing Common API Endpoints (without auth)...\n');

    // Test common endpoints to see what's available
    const commonEndpoints = [
      '/health',
      '/status',
      '/version',
      '/api/health',
      '/api/status',
      '/api/version',
      '/docs',
      '/swagger',
      '/api/docs'
    ];

    for (const baseUrl of testUrls.slice(0, 3)) { // Test only first 3 base URLs
      console.log(`📡 Testing Common Endpoints for: ${baseUrl}`);
      
      for (const endpoint of commonEndpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, {
            timeout: 3000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'EtsyAutomation/1.0'
            }
          });
          
          console.log(`   ✅ ${endpoint}: ${response.status} ${response.statusText}`);
          if (response.data && typeof response.data === 'object') {
            console.log(`      Response:`, response.data);
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.log(`   ⚠️ ${endpoint}: ${error.response?.status || error.code}`);
          }
        }
      }
      console.log('');
    }

    console.log('💡 Recommendations:');
    console.log('   1. Check OneClickLister dashboard for API documentation');
    console.log('   2. Contact OneClickLister support for correct API endpoints');
    console.log('   3. Verify if additional setup is needed for API access');
    console.log('   4. Check if there\'s a separate developer portal');

  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
    logger.error('OneClickLister auth test error', { error: error.message });
  }
}

async function testApiCall(baseUrl, accessToken) {
  console.log(`\n🧪 Testing API Call with Access Token...`);
  
  const testEndpoints = [
    '/user',
    '/profile',
    '/stores',
    '/shops',
    '/api/user',
    '/api/profile',
    '/api/stores'
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      console.log(`   ✅ ${endpoint}: SUCCESS`);
      console.log(`      Status: ${response.status}`);
      console.log(`      Response:`, response.data);
      break; // Exit on first success
    } catch (error) {
      const status = error.response?.status;
      if (status !== 404) {
        console.log(`   ⚠️ ${endpoint}: ${status || error.code}`);
      }
    }
  }
}

// Run the test
if (require.main === module) {
  testOneClickListerAuth();
}

module.exports = { testOneClickListerAuth };