const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class EtsyOAuthService {
  constructor() {
    this.clientId = config.etsy.apiKey; // In Etsy API v3, API Key = Client ID
    this.clientSecret = config.etsy.apiSecret;
    this.redirectUri = config.etsy.redirectUri;
    this.baseURL = config.etsy.baseURL;
    this.scopes = config.etsy.scopes;
  }

  /**
   * Generate OAuth 2.0 authorization URL
   * @param {string} state - Optional state parameter for security
   * @returns {Object} - Authorization URL and state
   */
  generateAuthUrl(state = null) {
    try {
      // Generate state for CSRF protection if not provided
      if (!state) {
        state = crypto.randomBytes(32).toString('hex');
      }

      // Generate code verifier and challenge for PKCE
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: this.scopes.join(' '),
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;

      logger.info('Generated Etsy OAuth URL', { 
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        scopes: this.scopes.length
      });

      return {
        authUrl,
        state,
        codeVerifier,
        codeChallenge
      };
    } catch (error) {
      logger.error('Error generating OAuth URL', { error: error.message });
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from callback
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Object} - Token response
   */
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      const tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code: code,
        code_verifier: codeVerifier
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;
      
      logger.info('Successfully exchanged code for token', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      };
    } catch (error) {
      logger.error('Error exchanging code for token', { 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} - New token data
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;
      
      logger.info('Successfully refreshed access token', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Some APIs don't return new refresh token
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      };
    } catch (error) {
      logger.error('Error refreshing access token', { 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Test API connection with current token
   * @param {string} accessToken - Access token to test
   * @returns {Object} - Test result
   */
  async testConnection(accessToken) {
    try {
      // Test with a simple API call - get user profile
      const response = await axios.get(`${this.baseURL}/application/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': this.clientId
        }
      });

      logger.info('OAuth connection test successful', {
        userId: response.data.user_id,
        loginName: response.data.login_name
      });

      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      logger.error('OAuth connection test failed', { 
        error: error.response?.data || error.message 
      });
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get shop information using access token
   * @param {string} accessToken - Access token
   * @param {string} shopId - Shop ID (optional, will get from user if not provided)
   * @returns {Object} - Shop information
   */
  async getShopInfo(accessToken, shopId = null) {
    try {
      let endpoint;
      
      if (shopId) {
        endpoint = `${this.baseURL}/application/shops/${shopId}`;
      } else {
        // Get user's shops first
        const userResponse = await axios.get(`${this.baseURL}/application/user`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': this.clientId
          }
        });
        
        const userId = userResponse.data.user_id;
        endpoint = `${this.baseURL}/application/users/${userId}/shops`;
      }

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': this.clientId
        }
      });

      logger.info('Successfully retrieved shop information', {
        shopId: shopId || 'auto-detected'
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting shop information', { 
        error: error.response?.data || error.message,
        shopId 
      });
      throw error;
    }
  }

  /**
   * Validate current access token and refresh if needed
   * @param {string} accessToken - Current access token
   * @param {string} refreshToken - Refresh token
   * @param {number} expiresAt - Token expiration timestamp
   * @returns {Object} - Valid token data
   */
  async validateAndRefreshToken(accessToken, refreshToken, expiresAt) {
    try {
      // Check if token is about to expire (5 minutes buffer)
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (Date.now() + bufferTime > expiresAt) {
        logger.info('Access token is about to expire, refreshing...');
        return await this.refreshAccessToken(refreshToken);
      }

      // Test current token
      const testResult = await this.testConnection(accessToken);
      
      if (testResult.success) {
        return {
          accessToken,
          refreshToken,
          expiresAt,
          valid: true
        };
      } else {
        // Token is invalid, try to refresh
        logger.info('Access token is invalid, attempting to refresh...');
        return await this.refreshAccessToken(refreshToken);
      }
    } catch (error) {
      logger.error('Error validating/refreshing token', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate OneClickLister compatible OAuth info
   * @param {Object} tokenData - Token data from OAuth flow
   * @returns {Object} - OneClickLister format info
   */
  generateOneClickListerInfo(tokenData) {
    return {
      apiKey: this.clientId,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : this.scopes,
      tokenType: tokenData.tokenType || 'Bearer',
      provider: 'etsy',
      version: 'v3'
    };
  }
}

module.exports = EtsyOAuthService;