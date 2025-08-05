const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const config = require('../config');
const logger = require('../utils/logger');

class EtsyOneClickListerService {
  constructor() {
    this.apiKey = config.etsy.apiKey;
    this.shopId = config.etsy.shopId;
    this.accessToken = config.etsy.accessToken;
    this.baseURL = 'https://openapi.etsy.com/v3';
  }

  /**
   * Transform OneClickLister payload to Etsy API format
   * @param {Object} oneClickPayload - OneClickLister format payload
   * @returns {Object} - Etsy API compatible format
   */
  transformPayload(oneClickPayload) {
    const { product } = oneClickPayload;
    
    return {
      // Basic listing information
      title: product.title,
      description: product.description,
      price: parseFloat(product.price.amount),
      quantity: product.quantity,
      sku: product.sku,
      tags: product.tags.map(tag => String(tag)),
      
      // Product specifications
      materials: this.extractMaterials(product.attributes),
      taxonomy_id: this.determineTaxonomyId(product.productType, product.attributes),
      
      // Dimensions and weight
      item_length: product.dimensions?.length ? parseFloat(product.dimensions.length) : null,
      item_width: product.dimensions?.width ? parseFloat(product.dimensions.width) : null,
      item_height: product.dimensions?.height ? parseFloat(product.dimensions.height) : null,
      item_weight: product.weight?.amount ? parseFloat(product.weight.amount) : null,
      item_dimensions_unit: this.mapDimensionUnit(product.dimensions?.unit),
      item_weight_unit: this.mapWeightUnit(product.weight?.unit),
      
      // Default Etsy required fields
      who_made: 'i_did',
      when_made: '2020_2024',
      type: 'physical',
      is_customizable: false,
      should_auto_renew: true,
      is_taxable: true,
      processing_min: 1,
      processing_max: 3,
      
      // Images processing
      images: product.images || [],
      deleted_images: product.deleted_images || [],
      
      // Variants support
      variants: product.variants || []
    };
  }

  /**
   * Extract materials from attributes
   * @param {Array} attributes - Product attributes
   * @returns {Array} - Materials array
   */
  extractMaterials(attributes = []) {
    const materialAttr = attributes.find(attr => 
      attr.name.toLowerCase().includes('material') || 
      attr.displayName.toLowerCase().includes('material')
    );
    
    if (materialAttr && Array.isArray(materialAttr.value)) {
      return materialAttr.value;
    } else if (materialAttr && typeof materialAttr.value === 'string') {
      return [materialAttr.value];
    }
    
    return ['Handmade'];
  }

  /**
   * Determine taxonomy ID from product type and attributes
   * @param {string} productType - Product type
   * @param {Array} attributes - Product attributes
   * @returns {number} - Taxonomy ID
   */
  determineTaxonomyId(productType, attributes = []) {
    // Map common product types to Etsy taxonomy IDs
    const taxonomyMap = {
      'jewelry': 68,
      'clothing': 69,
      'home': 888,
      'accessories': 68,
      'art': 69,
      'toys': 1063,
      'craft_supplies': 562
    };

    const normalizedType = productType.toLowerCase();
    
    for (const [key, value] of Object.entries(taxonomyMap)) {
      if (normalizedType.includes(key)) {
        return value;
      }
    }
    
    // Check attributes for category hints
    const categoryAttr = attributes.find(attr => 
      attr.name.toLowerCase().includes('category') ||
      attr.displayName.toLowerCase().includes('category')
    );
    
    if (categoryAttr) {
      const categoryValue = String(categoryAttr.value).toLowerCase();
      for (const [key, value] of Object.entries(taxonomyMap)) {
        if (categoryValue.includes(key)) {
          return value;
        }
      }
    }
    
    return 1; // Default fallback
  }

  /**
   * Map dimension units to Etsy format
   * @param {string} unit - Dimension unit
   * @returns {number} - Etsy dimension unit ID
   */
  mapDimensionUnit(unit) {
    const unitMap = {
      'mm': 1,
      'cm': 2,
      'in': 3,
      'ft': 4,
      'm': 5
    };
    
    return unitMap[unit?.toLowerCase()] || 2; // Default to cm
  }

  /**
   * Map weight units to Etsy format
   * @param {string} unit - Weight unit
   * @returns {number} - Etsy weight unit ID
   */
  mapWeightUnit(unit) {
    const unitMap = {
      'g': 1,
      'kg': 2,
      'oz': 3,
      'lb': 4
    };
    
    return unitMap[unit?.toLowerCase()] || 1; // Default to grams
  }

  /**
   * Create listing using OneClickLister payload
   * @param {Object} oneClickPayload - OneClickLister format payload
   * @returns {Object} - Created listing data
   */
  async createListingFromPayload(oneClickPayload) {
    try {
      logger.info('Creating listing from OneClickLister payload', { 
        title: oneClickPayload.product.title,
        sku: oneClickPayload.product.sku
      });

      const listingData = this.transformPayload(oneClickPayload);
      
      // Get shipping templates
      const shippingTemplates = await this.getShippingTemplates();
      const shippingTemplateId = shippingTemplates[0]?.shipping_template_id;
      
      if (!shippingTemplateId) {
        throw new Error('No shipping templates found. Please create one in your Etsy shop.');
      }

      // Prepare final payload for Etsy API
      const etsyPayload = {
        quantity: listingData.quantity,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        who_made: listingData.who_made,
        when_made: listingData.when_made,
        taxonomy_id: listingData.taxonomy_id,
        shipping_template_id: shippingTemplateId,
        materials: listingData.materials,
        processing_min: listingData.processing_min,
        processing_max: listingData.processing_max,
        tags: listingData.tags,
        item_weight: listingData.item_weight,
        item_length: listingData.item_length,
        item_width: listingData.item_width,
        item_height: listingData.item_height,
        is_customizable: listingData.is_customizable,
        should_auto_renew: listingData.should_auto_renew,
        is_taxable: listingData.is_taxable,
        type: listingData.type
      };

      // Remove null values
      Object.keys(etsyPayload).forEach(key => {
        if (etsyPayload[key] === null || etsyPayload[key] === undefined) {
          delete etsyPayload[key];
        }
      });

      const url = `${this.baseURL}/application/shops/${this.shopId}/listings`;
      
      const response = await axios.post(url, etsyPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const listingId = response.data.listing_id;
      
      // Handle images if provided
      if (listingData.images && listingData.images.length > 0) {
        await this.processImages(listingId, listingData.images);
      }

      // Handle variants if provided
      if (listingData.variants && listingData.variants.length > 0) {
        await this.processVariants(listingId, listingData.variants);
      }

      logger.info('Listing created successfully from OneClickLister payload', { 
        listingId,
        title: listingData.title,
        sku: listingData.sku
      });

      return {
        listingId,
        url: `https://www.etsy.com/listing/${listingId}`,
        title: listingData.title,
        sku: listingData.sku,
        originalPayload: oneClickPayload
      };

    } catch (error) {
      logger.error('Error creating listing from OneClickLister payload', { 
        error: error.response?.data || error.message,
        title: oneClickPayload.product.title,
        sku: oneClickPayload.product.sku
      });
      throw error;
    }
  }

  /**
   * Process images from OneClickLister format
   * @param {string} listingId - Etsy listing ID
   * @param {Array} images - Image array from OneClickLister
   */
  async processImages(listingId, images) {
    try {
      // Sort images by position
      const sortedImages = images.sort((a, b) => {
        const posA = parseInt(a.position) || 0;
        const posB = parseInt(b.position) || 0;
        return posA - posB;
      });

      for (let i = 0; i < sortedImages.length; i++) {
        const image = sortedImages[i];
        
        if (image.url && !image.newImage) {
          // Handle existing images - might need to update alt text
          continue;
        }
        
        if (image.url && image.newImage) {
          // Download and upload new image
          await this.uploadImageFromUrl(listingId, image.url, image.position, image.altText);
        }
        
        // Add delay to avoid rate limiting
        if (i < sortedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      logger.error('Error processing images', { error: error.message, listingId });
      throw error;
    }
  }

  /**
   * Upload image from URL
   * @param {string} listingId - Etsy listing ID
   * @param {string} imageUrl - Image URL
   * @param {number} position - Image position
   * @param {string} altText - Alt text for SEO
   */
  async uploadImageFromUrl(listingId, imageUrl, position = 1, altText = '') {
    try {
      // Download image first
      const response = await axios.get(imageUrl, { responseType: 'stream' });
      const tempPath = `/tmp/temp_image_${Date.now()}.jpg`;
      
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Upload to Etsy
      const result = await this.uploadListingImage(listingId, tempPath, position, altText);
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      return result;
    } catch (error) {
      logger.error('Error uploading image from URL', { error: error.message, imageUrl });
      throw error;
    }
  }

  /**
   * Upload listing image with alt text support
   * @param {string} listingId - Etsy listing ID
   * @param {string} imagePath - Local image path
   * @param {number} rank - Image position
   * @param {string} altText - Alt text for SEO
   */
  async uploadListingImage(listingId, imagePath, rank = 1, altText = '') {
    try {
      const url = `${this.baseURL}/application/shops/${this.shopId}/listings/${listingId}/images`;
      
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      form.append('rank', rank.toString());
      form.append('overwrite', 'true');
      form.append('is_watermarked', 'false');
      
      if (altText) {
        form.append('alt_text', altText);
      }

      const response = await axios.post(url, form, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey,
          ...form.getHeaders()
        }
      });

      logger.info('Image uploaded with alt text', { 
        listingId,
        imageId: response.data.listing_image_id,
        rank,
        altText
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error uploading image with alt text', { 
        error: error.response?.data || error.message,
        listingId,
        imagePath,
        altText
      });
      throw error;
    }
  }

  /**
   * Process variants from OneClickLister format
   * @param {string} listingId - Etsy listing ID
   * @param {Array} variants - Variants array
   */
  async processVariants(listingId, variants) {
    try {
      logger.info('Processing variants for listing', { listingId, variantCount: variants.length });
      
      // For now, log variant information for future implementation
      // Etsy variant API is complex and requires separate implementation
      for (const variant of variants) {
        logger.info('Variant data', {
          listingId,
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          properties: variant.properties
        });
      }
      
      // TODO: Implement full variant creation via Etsy API
      logger.warn('Variant creation not yet implemented - variants logged for reference');
      
    } catch (error) {
      logger.error('Error processing variants', { error: error.message, listingId });
      throw error;
    }
  }

  /**
   * Get shipping templates
   * @returns {Array} - Shipping templates
   */
  async getShippingTemplates() {
    try {
      const url = `${this.baseURL}/application/shops/${this.shopId}/shipping-templates`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey
        }
      });

      return response.data.results;
    } catch (error) {
      logger.error('Error getting shipping templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate OneClickLister payload
   * @param {Object} payload - OneClickLister payload
   * @returns {Object} - Validation result
   */
  validatePayload(payload) {
    const errors = [];
    const warnings = [];

    if (!payload.product) {
      errors.push('Missing product object');
      return { valid: false, errors, warnings };
    }

    const { product } = payload;

    // Required fields
    if (!product.title) errors.push('Missing product title');
    if (!product.description) errors.push('Missing product description');
    if (!product.price || !product.price.amount) errors.push('Missing product price');
    if (!product.sku) errors.push('Missing product SKU');

    // Warnings for optional but recommended fields
    if (!product.tags || product.tags.length === 0) {
      warnings.push('No tags provided - SEO may be impacted');
    }
    
    if (!product.images || product.images.length === 0) {
      warnings.push('No images provided');
    }

    if (product.tags && product.tags.length > 13) {
      errors.push('Too many tags - Etsy allows maximum 13 tags');
    }

    if (product.title && product.title.length > 140) {
      errors.push('Title too long - Etsy allows maximum 140 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = EtsyOneClickListerService;