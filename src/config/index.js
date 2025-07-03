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
    apiKey: process.env.ETSY_API_KEY,
    shopId: process.env.ETSY_SHOP_ID,
    accessToken: process.env.ETSY_ACCESS_TOKEN
  },
  processing: {
    outputImageSize: parseInt(process.env.OUTPUT_IMAGE_SIZE) || 3000,
    processingInterval: parseInt(process.env.PROCESSING_INTERVAL) || 60000,
    // Background options
    addBackground: process.env.ADD_BACKGROUND === 'true' || false,
    backgroundType: process.env.BACKGROUND_TYPE || 'solid', // solid, gradient, image, random
    backgroundColor: process.env.BACKGROUND_COLOR || '#FFFFFF',
    gradientColors: process.env.GRADIENT_COLORS ? process.env.GRADIENT_COLORS.split(',') : ['#FFFFFF', '#F0F0F0'],
    backgroundImagePath: process.env.BACKGROUND_IMAGE_PATH || null,
    removeBackground: process.env.REMOVE_BACKGROUND === 'true' || false
  }
};