const EtsyAutomation = require('./index');
const GoogleDriveService = require('./services/googleDrive');
const OpenAIService = require('./services/openai');
const EnhancedImageProcessor = require('./services/enhancedImageProcessor');
const CSVExportService = require('./services/csvExport');

class UserAutomation extends EtsyAutomation {
  constructor(userTokens) {
    super();
    
    // Override services with user-specific tokens
    if (userTokens) {
      // Temporarily set environment variables for this instance
      this.originalEnv = {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
        GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        CUSTOM_GPT_ID: process.env.CUSTOM_GPT_ID
      };

      // Set user tokens
      process.env.GOOGLE_CLIENT_ID = userTokens.google_client_id;
      process.env.GOOGLE_CLIENT_SECRET = userTokens.google_client_secret;
      process.env.GOOGLE_REFRESH_TOKEN = userTokens.google_refresh_token;
      process.env.GOOGLE_DRIVE_FOLDER_ID = userTokens.google_drive_folder_id;
      process.env.OPENAI_API_KEY = userTokens.openai_api_key;
      process.env.CUSTOM_GPT_ID = userTokens.custom_gpt_id;

      // Re-initialize services with new tokens
      this.googleDrive = new GoogleDriveService();
      this.openai = new OpenAIService();
      this.imageProcessor = new ImageProcessor();
      this.csvExport = new CSVExportService();
    }
  }

  // Clean up environment after processing
  cleanup() {
    if (this.originalEnv) {
      Object.keys(this.originalEnv).forEach(key => {
        if (this.originalEnv[key]) {
          process.env[key] = this.originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    }
  }

  // Override processFolder to ensure cleanup
  async processFolder(folder) {
    try {
      return await super.processFolder(folder);
    } finally {
      this.cleanup();
    }
  }
}

module.exports = UserAutomation;