const EtsyOAuthService = require('./src/services/etsyOAuth');
const express = require('express');
const logger = require('./src/utils/logger');

const app = express();
const port = 3000;

// Store OAuth state and code verifier temporarily
const oauthStates = new Map();

const oauthService = new EtsyOAuthService();

console.log('🔐 Etsy OAuth 2.0 Setup Tool');
console.log('============================\n');

if (!process.env.ETSY_API_KEY || !process.env.ETSY_API_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('   - ETSY_API_KEY');
  console.error('   - ETSY_API_SECRET');
  console.error('\n📝 Please add these to your .env file first!');
  process.exit(1);
}

// Serve a simple HTML page for starting OAuth
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Etsy OAuth Setup</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .button { background: #ff6600; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .code { background: #000; color: #0f0; padding: 10px; font-family: monospace; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>🔐 Etsy OAuth 2.0 Setup</h1>
      <div class="info">
        <h3>📋 Required Scopes:</h3>
        <ul>
          <li><strong>listings_r/w</strong> - Create and manage listings</li>
          <li><strong>transactions_r/w</strong> - Handle orders and fulfillment</li>
          <li><strong>shops_r/w</strong> - Access shop information</li>
          <li><strong>shipping_r/w</strong> - Manage shipping templates</li>
          <li><strong>profile_r</strong> - Access user profile</li>
        </ul>
      </div>
      
      <p><strong>Step 1:</strong> Click the button below to start the OAuth flow:</p>
      <p><a href="/auth/start" class="button">🚀 Start Etsy Authorization</a></p>
      
      <div class="info">
        <h3>🔧 Configuration Status:</h3>
        <div class="code">
          API Key: ${process.env.ETSY_API_KEY ? '✅ Configured' : '❌ Missing'}<br>
          API Secret: ${process.env.ETSY_API_SECRET ? '✅ Configured' : '❌ Missing'}<br>
          Shop ID: ${process.env.ETSY_SHOP_ID || '❓ Will be auto-detected'}<br>
          Redirect URI: ${process.env.ETSY_REDIRECT_URI || 'http://localhost:3000/auth/etsy/callback'}
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start OAuth flow
app.get('/auth/start', (req, res) => {
  try {
    const authData = oauthService.generateAuthUrl();
    
    // Store state and code verifier for later use
    oauthStates.set(authData.state, {
      codeVerifier: authData.codeVerifier,
      timestamp: Date.now()
    });
    
    console.log('🔗 Generated OAuth URL:', authData.authUrl);
    console.log('📝 State:', authData.state);
    
    res.redirect(authData.authUrl);
  } catch (error) {
    console.error('❌ Error starting OAuth flow:', error.message);
    res.status(500).send('Error starting OAuth flow: ' + error.message);
  }
});

// Handle OAuth callback
app.get('/auth/etsy/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error('❌ OAuth error:', error, error_description);
      return res.status(400).send(`OAuth Error: ${error} - ${error_description}`);
    }
    
    if (!code || !state) {
      console.error('❌ Missing code or state in callback');
      return res.status(400).send('Missing authorization code or state');
    }
    
    // Verify state and get code verifier
    const storedData = oauthStates.get(state);
    if (!storedData) {
      console.error('❌ Invalid or expired state');
      return res.status(400).send('Invalid or expired state');
    }
    
    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [key, value] of oauthStates.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        oauthStates.delete(key);
      }
    }
    
    console.log('✅ Received authorization code, exchanging for token...');
    
    // Exchange code for token
    const tokenData = await oauthService.exchangeCodeForToken(code, storedData.codeVerifier);
    
    console.log('🎉 Successfully obtained access token!');
    
    // Test the connection
    const testResult = await oauthService.testConnection(tokenData.accessToken);
    
    let shopInfo = null;
    if (testResult.success) {
      try {
        shopInfo = await oauthService.getShopInfo(tokenData.accessToken);
      } catch (error) {
        console.warn('⚠️ Could not fetch shop info:', error.message);
      }
    }
    
    // Clean up state
    oauthStates.delete(state);
    
    // Generate OneClickLister format info
    const oclInfo = oauthService.generateOneClickListerInfo(tokenData);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; }
          .code { background: #000; color: #0f0; padding: 15px; font-family: monospace; border-radius: 3px; white-space: pre-wrap; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>🎉 OAuth Setup Successful!</h2>
          <p>Your Etsy API tokens have been generated successfully.</p>
        </div>
        
        ${testResult.success ? `
          <h3>✅ Connection Test: PASSED</h3>
          <p><strong>User:</strong> ${testResult.user.login_name} (ID: ${testResult.user.user_id})</p>
        ` : `
          <div class="warning">
            <h3>⚠️ Connection Test: FAILED</h3>
            <p>Error: ${testResult.error}</p>
          </div>
        `}
        
        ${shopInfo ? `
          <h3>🏪 Shop Information:</h3>
          <p><strong>Shop Name:</strong> ${shopInfo.shop_name || shopInfo.results?.[0]?.shop_name || 'N/A'}</p>
          <p><strong>Shop ID:</strong> ${shopInfo.shop_id || shopInfo.results?.[0]?.shop_id || 'N/A'}</p>
        ` : ''}
        
        <h3>🔧 Environment Variables</h3>
        <p>Add these to your <code>.env</code> file:</p>
        <div class="code">ETSY_ACCESS_TOKEN=${tokenData.accessToken}
ETSY_REFRESH_TOKEN=${tokenData.refreshToken}
${shopInfo ? `ETSY_SHOP_ID=${shopInfo.shop_id || shopInfo.results?.[0]?.shop_id || 'YOUR_SHOP_ID'}` : 'ETSY_SHOP_ID=YOUR_SHOP_ID'}
ETSY_TOKEN_EXPIRES_AT=${tokenData.expiresAt}</div>

        <h3>🔗 OneClickLister Integration Info</h3>
        <div class="code">${JSON.stringify(oclInfo, null, 2)}</div>
        
        <div class="warning">
          <h4>⚠️ Important Security Notes:</h4>
          <ul>
            <li>Keep your tokens secure and never share them publicly</li>
            <li>The access token expires in ${Math.floor(tokenData.expiresIn / 3600)} hours</li>
            <li>Use the refresh token to get new access tokens automatically</li>
            <li>Store tokens in environment variables, not in your code</li>
          </ul>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Copy the environment variables above to your .env file</li>
          <li>Restart your application</li>
          <li>Test the connection with: <code>node test-connection.js</code></li>
        </ol>
      </body>
      </html>
    `);
    
    // Log the tokens for console access
    console.log('\n🔐 TOKENS GENERATED:');
    console.log('===================');
    console.log('Access Token:', tokenData.accessToken);
    console.log('Refresh Token:', tokenData.refreshToken);
    console.log('Expires At:', new Date(tokenData.expiresAt).toISOString());
    console.log('Scopes:', tokenData.scope);
    if (shopInfo) {
      console.log('Shop ID:', shopInfo.shop_id || shopInfo.results?.[0]?.shop_id);
    }
    console.log('\n📝 Add these to your .env file:');
    console.log(`ETSY_ACCESS_TOKEN=${tokenData.accessToken}`);
    console.log(`ETSY_REFRESH_TOKEN=${tokenData.refreshToken}`);
    if (shopInfo) {
      console.log(`ETSY_SHOP_ID=${shopInfo.shop_id || shopInfo.results?.[0]?.shop_id}`);
    }
    console.log(`ETSY_TOKEN_EXPIRES_AT=${tokenData.expiresAt}`);
    
  } catch (error) {
    console.error('❌ Error in OAuth callback:', error.message);
    res.status(500).send('Error completing OAuth flow: ' + error.message);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🌐 OAuth setup server running at http://localhost:${port}`);
  console.log(`\n📋 Instructions:`);
  console.log(`1. Open your browser and go to: http://localhost:${port}`);
  console.log(`2. Click "Start Etsy Authorization"`);
  console.log(`3. Log in to your Etsy account and authorize the app`);
  console.log(`4. Copy the tokens to your .env file`);
  console.log(`5. Press Ctrl+C to stop this server\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down OAuth setup server...');
  process.exit(0);
});