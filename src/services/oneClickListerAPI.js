const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class OneClickListerAPI {
  constructor(options = {}) {
    // OneClickLister API configuration
    this.baseURL = options.baseURL || process.env.ONECLICKLISTER_API_URL || 'https://oneclicklister.com';
    this.clientId = options.clientId || process.env.ONECLICKLISTER_API_KEY;
    this.clientSecret = options.clientSecret || process.env.ONECLICKLISTER_API_SECRET;
    this.userCode = options.userCode || process.env.ONECLICKLISTER_USER_CODE;
    this.storeId = options.storeId || process.env.ONECLICKLISTER_STORE_ID;
    
    // Access token for authenticated requests (will be obtained via OAuth)
    this.accessToken = null;
    
    // Default headers for OneClickLister API
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'EtsyAutomation/1.0'
    };
  }

  /**
   * Validate API configuration
   * @returns {Object} - Validation result
   */
  validateConfig() {
    const errors = [];
    
    if (!this.clientId) errors.push('Missing ONECLICKLISTER_API_KEY (Client ID)');
    if (!this.clientSecret) errors.push('Missing ONECLICKLISTER_API_SECRET (Client Secret)');
    if (!this.userCode) errors.push('Missing ONECLICKLISTER_USER_CODE');
    if (!this.storeId) errors.push('Missing ONECLICKLISTER_STORE_ID');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Authenticate with OneClickLister API using Client Credentials
   * @returns {Object} - Authentication result with access token
   */
  async authenticate() {
    try {
      logger.info('Authenticating with OneClickLister API', { 
        clientId: this.clientId?.substring(0, 8) + '...',
        baseURL: this.baseURL
      });

      // OneClickLister uses Etsy OAuth, not direct client credentials
      // For now, we'll need to implement Etsy OAuth flow through OneClickLister
      const response = await axios.post(`${this.baseURL}/api/auth/etsy`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        user_code: this.userCode
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EtsyAutomation/1.0'
        }
      });

      this.accessToken = response.data.access_token;
      
      // Update default headers with access token
      this.defaultHeaders.Authorization = `Bearer ${this.accessToken}`;

      logger.info('OneClickLister authentication successful', {
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in
      });

      return {
        success: true,
        accessToken: this.accessToken,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      logger.error('OneClickLister authentication failed', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        clientId: this.clientId?.substring(0, 8) + '...'
      });

      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureAuthenticated() {
    if (!this.accessToken) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
    }
  }

  /**
   * Make authenticated request to OneClickLister API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Object} - API response
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      // Ensure we have a valid access token
      await this.ensureAuthenticated();

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: this.defaultHeaders,
        timeout: 30000 // 30 seconds timeout
      };

      if (data) {
        config.data = data;
      }

      logger.info('OneClickLister API request', { 
        method, 
        endpoint, 
        hasData: !!data,
        hasAuth: !!this.accessToken
      });

      const response = await axios(config);
      
      logger.info('OneClickLister API response', { 
        method, 
        endpoint, 
        status: response.status 
      });

      return response.data;
    } catch (error) {
      logger.error('OneClickLister API error', { 
        method, 
        endpoint, 
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Test API authorization
   * @returns {Object} - Authorization test result
   */
  async testAuthorization() {
    try {
      const response = await this.makeRequest('GET', '/auth/test');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch store information
   * @returns {Object} - Store information
   */
  async fetchStores() {
    try {
      const response = await this.makeRequest('GET', '/api/stores');
      return response;
    } catch (error) {
      logger.error('Error fetching stores');
      throw error;
    }
  }

  /**
   * Fetch specific listing
   * @param {string} listingId - Listing ID
   * @returns {Object} - Listing information
   */
  async fetchListing(listingId) {
    try {
      const response = await this.makeRequest('GET', `/api/listing/${listingId}`);
      return response;
    } catch (error) {
      logger.error('Error fetching listing', { listingId });
      throw error;
    }
  }

  /**
   * Get listing locations
   * @returns {Array} - List of listing locations
   */
  async getListingLocations() {
    try {
      const response = await this.makeRequest('GET', '/api/listing/locations');
      return response;
    } catch (error) {
      logger.error('Error fetching listing locations');
      throw error;
    }
  }

  /**
   * Create a single product using OneClickLister payload format
   * @param {Object} productPayload - OneClickLister product payload
   * @returns {Object} - Created product response
   */
  async createProduct(productPayload) {
    try {
      // Validate payload structure
      if (!productPayload.product) {
        throw new Error('Invalid payload: missing product object');
      }

      // Ensure storeId and userCode are set
      const payload = {
        ...productPayload,
        storeId: productPayload.storeId || this.storeId,
        userCode: productPayload.userCode || this.userCode
      };

      logger.info('Creating product via OneClickLister', { 
        title: payload.product.title,
        sku: payload.product.sku,
        storeId: payload.storeId
      });

      const response = await this.makeRequest('POST', '/api/product/create', payload);
      
      logger.info('Product created successfully', { 
        productId: response.productId || response.id,
        title: payload.product.title
      });

      return response;
    } catch (error) {
      logger.error('Error creating product', { 
        error: error.message,
        title: productPayload.product?.title
      });
      throw error;
    }
  }

  /**
   * Create multiple products in bulk
   * @param {Array} productPayloads - Array of OneClickLister product payloads
   * @returns {Object} - Bulk creation response
   */
  async createProductsBulk(productPayloads) {
    try {
      // Validate payloads
      if (!Array.isArray(productPayloads) || productPayloads.length === 0) {
        throw new Error('Invalid payloads: must be non-empty array');
      }

      // Ensure storeId and userCode are set for all payloads
      const processedPayloads = productPayloads.map(payload => ({
        ...payload,
        storeId: payload.storeId || this.storeId,
        userCode: payload.userCode || this.userCode
      }));

      logger.info('Creating products in bulk via OneClickLister', { 
        count: processedPayloads.length,
        storeId: this.storeId
      });

      const response = await this.makeRequest('POST', '/api/product/create-bulk', {
        products: processedPayloads
      });

      logger.info('Bulk products created successfully', { 
        count: processedPayloads.length,
        successCount: response.successCount || 0,
        errorCount: response.errorCount || 0
      });

      return response;
    } catch (error) {
      logger.error('Error creating products in bulk', { 
        error: error.message,
        count: productPayloads.length
      });
      throw error;
    }
  }

  /**
   * Update a product
   * @param {string} productId - Product ID to update
   * @param {Object} productPayload - Updated product data
   * @returns {Object} - Update response
   */
  async updateProduct(productId, productPayload) {
    try {
      const payload = {
        ...productPayload,
        storeId: productPayload.storeId || this.storeId,
        userCode: productPayload.userCode || this.userCode
      };

      logger.info('Updating product via OneClickLister', { 
        productId,
        title: payload.product?.title
      });

      const response = await this.makeRequest('PUT', `/api/product/update/${productId}`, payload);
      
      logger.info('Product updated successfully', { productId });

      return response;
    } catch (error) {
      logger.error('Error updating product', { 
        error: error.message,
        productId
      });
      throw error;
    }
  }

  /**
   * Update multiple products in bulk
   * @param {Array} updates - Array of {productId, payload} objects
   * @returns {Object} - Bulk update response
   */
  async updateProductsBulk(updates) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('Invalid updates: must be non-empty array');
      }

      const processedUpdates = updates.map(update => ({
        productId: update.productId,
        payload: {
          ...update.payload,
          storeId: update.payload.storeId || this.storeId,
          userCode: update.payload.userCode || this.userCode
        }
      }));

      logger.info('Updating products in bulk via OneClickLister', { 
        count: processedUpdates.length 
      });

      const response = await this.makeRequest('PUT', '/api/product/update-bulk', {
        updates: processedUpdates
      });

      logger.info('Bulk products updated successfully', { 
        count: processedUpdates.length 
      });

      return response;
    } catch (error) {
      logger.error('Error updating products in bulk', { 
        error: error.message,
        count: updates.length
      });
      throw error;
    }
  }

  /**
   * Sync store data
   * @param {Object} syncOptions - Sync configuration
   * @returns {Object} - Sync response
   */
  async syncStore(syncOptions = {}) {
    try {
      const payload = {
        storeId: syncOptions.storeId || this.storeId,
        userCode: this.userCode,
        syncType: syncOptions.syncType || 'full',
        ...syncOptions
      };

      logger.info('Syncing store via OneClickLister', { 
        storeId: payload.storeId,
        syncType: payload.syncType
      });

      const response = await this.makeRequest('POST', '/api/store/sync', payload);
      
      logger.info('Store sync completed', { 
        storeId: payload.storeId,
        syncId: response.syncId
      });

      return response;
    } catch (error) {
      logger.error('Error syncing store', { 
        error: error.message,
        storeId: syncOptions.storeId || this.storeId
      });
      throw error;
    }
  }

  /**
   * Get Etsy categories
   * @returns {Array} - List of Etsy categories
   */
  async getEtsyCategories() {
    try {
      const response = await this.makeRequest('GET', '/api/categories/etsy');
      return response;
    } catch (error) {
      logger.error('Error fetching Etsy categories', { error: error.message });
      throw error;
    }
  }

  /**
   * Get detailed Etsy category information
   * @param {string} categoryId - Category ID
   * @returns {Object} - Category details
   */
  async getEtsyCategoryDetail(categoryId) {
    try {
      const response = await this.makeRequest('GET', `/api/categories/etsy/${categoryId}`);
      return response;
    } catch (error) {
      logger.error('Error fetching Etsy category detail', { 
        error: error.message,
        categoryId
      });
      throw error;
    }
  }

  /**
   * Get shipping profiles
   * @param {string} storeId - Store ID (optional)
   * @returns {Array} - List of shipping profiles
   */
  async getShippingProfiles(storeId = null) {
    try {
      const targetStoreId = storeId || this.storeId;
      const response = await this.makeRequest('GET', '/api/shipping-profiles');
      return response;
    } catch (error) {
      logger.error('Error fetching shipping profiles', { 
        error: error.message,
        storeId: targetStoreId
      });
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object} - Job status
   */
  async getJobStatus(jobId) {
    try {
      const response = await this.makeRequest('GET', `/api/jobs/${jobId}`);
      return response;
    } catch (error) {
      logger.error('Error fetching job status', { 
        error: error.message,
        jobId
      });
      throw error;
    }
  }

  /**
   * List all jobs
   * @param {Object} options - Query options
   * @returns {Array} - List of jobs
   */
  async listJobs(options = {}) {
    try {
      const params = new URLSearchParams({
        storeId: options.storeId || this.storeId,
        status: options.status || 'all',
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      const response = await this.makeRequest('GET', `/api/jobs?${params}`);
      return response;
    } catch (error) {
      logger.error('Error listing jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a schedule
   * @param {Object} scheduleData - Schedule configuration
   * @returns {Object} - Created schedule
   */
  async createSchedule(scheduleData) {
    try {
      const payload = {
        ...scheduleData,
        storeId: scheduleData.storeId || this.storeId,
        userCode: this.userCode
      };

      logger.info('Creating schedule via OneClickLister', { 
        name: payload.name,
        storeId: payload.storeId
      });

      const response = await this.makeRequest('POST', '/api/schedules/create', payload);
      
      logger.info('Schedule created successfully', { 
        scheduleId: response.scheduleId || response.id,
        name: payload.name
      });

      return response;
    } catch (error) {
      logger.error('Error creating schedule', { 
        error: error.message,
        name: scheduleData.name
      });
      throw error;
    }
  }

  /**
   * Convert Etsy automation product to OneClickLister format
   * @param {Object} etsyProduct - Product from Etsy automation
   * @param {Array} imagePaths - Array of image file paths
   * @returns {Object} - OneClickLister payload
   */
  convertEtsyProductToOCL(etsyProduct, imagePaths = []) {
    const images = imagePaths.map((imagePath, index) => ({
      altText: `${etsyProduct.title} - Image ${index + 1}`,
      height: 3000,
      listingImageId: null,
      newImage: true,
      position: index + 1,
      skuId: null,
      url: imagePath.startsWith('http') ? imagePath : `file://${imagePath}`,
      width: 3000
    }));

    return {
      product: {
        attributes: [
          {
            displayName: "Category",
            name: "category",
            value: etsyProduct.categories?.[0] || "handmade"
          },
          {
            displayName: "Materials",
            name: "materials",
            value: Array.isArray(etsyProduct.materials) ? etsyProduct.materials : ["Handmade"]
          }
        ],
        deleted_images: [],
        description: etsyProduct.description,
        dimensions: null, // Could be populated from product data
        images: images,
        listingId: null,
        mainSkuId: null,
        price: {
          amount: etsyProduct.price?.toString() || "19.99",
          currency: "USD"
        },
        productType: this.inferProductType(etsyProduct.title || etsyProduct.categories?.[0]),
        properties: [],
        quantity: etsyProduct.quantity || 1,
        sku: etsyProduct.sku,
        status: "active",
        tags: Array.isArray(etsyProduct.tags) ? etsyProduct.tags : [],
        title: etsyProduct.title,
        variants: [],
        videos: [],
        weight: null
      },
      storeId: parseInt(this.storeId),
      userCode: this.userCode
    };
  }

  /**
   * Infer product type from title or category
   * @param {string} input - Product title or category
   * @returns {string} - Product type
   */
  inferProductType(input = '') {
    const text = input.toLowerCase();
    
    if (text.includes('jewelry') || text.includes('ring') || text.includes('necklace')) {
      return 'jewelry';
    }
    if (text.includes('clothing') || text.includes('shirt') || text.includes('dress')) {
      return 'clothing';
    }
    if (text.includes('home') || text.includes('decor') || text.includes('pillow')) {
      return 'home_living';
    }
    if (text.includes('art') || text.includes('print') || text.includes('poster')) {
      return 'art_collectibles';
    }
    
    return 'handmade';
  }
}

module.exports = OneClickListerAPI;