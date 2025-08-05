require('dotenv').config();

module.exports = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    customGptId: process.env.CUSTOM_GPT_ID
  },
  etsy: {
    // Etsy API v3 Configuration
    apiKey: process.env.ETSY_API_KEY,
    apiSecret: process.env.ETSY_API_SECRET,
    shopId: process.env.ETSY_SHOP_ID,
    accessToken: process.env.ETSY_ACCESS_TOKEN,
    refreshToken: process.env.ETSY_REFRESH_TOKEN,
    // OAuth 2.0 Settings
    clientId: process.env.ETSY_CLIENT_ID,
    redirectUri: process.env.ETSY_REDIRECT_URI || 'http://localhost:3000/auth/etsy/callback',
    // API v3 Base URL
    baseURL: 'https://openapi.etsy.com/v3',
    // Required Scopes for full functionality
    scopes: [
      'transactions_r',      // Read transaction data
      'transactions_w',      // Write transaction data (fulfillment)
      'listings_r',          // Read listings
      'listings_w',          // Write/manage listings
      'listings_d',          // Delete listings
      'shops_r',             // Read shop information
      'shops_w',             // Write shop information
      'shipping_r',          // Read shipping templates
      'shipping_w',          // Write shipping templates
      'profile_r',           // Read profile information
      'profile_w',           // Write profile information
      'address_r',           // Read addresses
      'address_w',           // Write addresses
      'favorites_r',         // Read favorites
      'favorites_w',         // Write favorites
      'feedback_r',          // Read feedback
      'cart_r',              // Read cart
      'cart_w',              // Write cart
      'recommend_r',         // Read recommendations
      'shops_r',             // Read shop sections
      'billing_r'            // Read billing information
    ]
  },
  oneClickLister: {
    // OneClickLister API Configuration
    clientId: process.env.ONECLICKLISTER_API_KEY,
    clientSecret: process.env.ONECLICKLISTER_API_SECRET,
    apiUrl: process.env.ONECLICKLISTER_API_URL || 'https://api.oneclicklister.com',
    userCode: process.env.ONECLICKLISTER_USER_CODE,
    storeId: process.env.ONECLICKLISTER_STORE_ID,
    // Integration settings
    enabled: process.env.USE_ONECLICKLISTER === 'true',
    bulkBatchSize: parseInt(process.env.ONECLICKLISTER_BATCH_SIZE) || 10,
    timeout: parseInt(process.env.ONECLICKLISTER_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.ONECLICKLISTER_RETRY_ATTEMPTS) || 3
  },
  processing: {
    outputImageSize: parseInt(process.env.OUTPUT_IMAGE_SIZE) || 3000,
    processingInterval: parseInt(process.env.PROCESSING_INTERVAL) || 60000,
    // Background options
    addBackground: process.env.ADD_BACKGROUND !== 'false', // Default: true (enabled)
    backgroundType: process.env.BACKGROUND_TYPE || 'solid', // solid, gradient, image, random
    backgroundColor: process.env.BACKGROUND_COLOR || '#FFFFFF',
    gradientColors: process.env.GRADIENT_COLORS ? process.env.GRADIENT_COLORS.split(',') : ['#FFFFFF', '#F0F0F0'],
    backgroundImagePath: process.env.BACKGROUND_IMAGE_PATH || null,
    removeBackground: process.env.REMOVE_BACKGROUND === 'true' || false
  }
};