const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const config = require('../config');
const logger = require('../utils/logger');

class EtsyService {
  constructor() {
    this.apiKey = config.etsy.apiKey;
    this.shopId = config.etsy.shopId;
    this.accessToken = config.etsy.accessToken;
    this.baseURL = 'https://openapi.etsy.com/v3';
  }

  async createListing(listingData) {
    try {
      const url = `${this.baseURL}/application/shops/${this.shopId}/listings`;
      
      const payload = {
        quantity: listingData.quantity || 1,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        who_made: listingData.whoMade || 'i_did',
        when_made: listingData.whenMade || '2020_2024',
        taxonomy_id: listingData.taxonomyId || 1,
        shipping_template_id: listingData.shippingTemplateId,
        materials: listingData.materials || [],
        shop_section_id: listingData.shopSectionId,
        processing_min: listingData.processingMin || 1,
        processing_max: listingData.processingMax || 3,
        tags: listingData.tags,
        styles: listingData.styles || [],
        item_weight: listingData.itemWeight,
        item_length: listingData.itemLength,
        item_width: listingData.itemWidth,
        item_height: listingData.itemHeight,
        is_customizable: listingData.isCustomizable || false,
        should_auto_renew: listingData.shouldAutoRenew || true,
        is_taxable: listingData.isTaxable || true,
        type: 'physical'
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      logger.info('Listing created successfully', { 
        listingId: response.data.listing_id,
        title: listingData.title 
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error creating listing', { 
        error: error.response?.data || error.message,
        title: listingData.title 
      });
      throw error;
    }
  }

  async uploadListingImage(listingId, imagePath, rank = 1) {
    try {
      const url = `${this.baseURL}/application/shops/${this.shopId}/listings/${listingId}/images`;
      
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      form.append('rank', rank.toString());
      form.append('overwrite', 'true');
      form.append('is_watermarked', 'false');

      const response = await axios.post(url, form, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey,
          ...form.getHeaders()
        }
      });

      logger.info('Image uploaded successfully', { 
        listingId,
        imageId: response.data.listing_image_id,
        rank 
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error uploading image', { 
        error: error.response?.data || error.message,
        listingId,
        imagePath 
      });
      throw error;
    }
  }

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

  async getShopSections() {
    try {
      const url = `${this.baseURL}/application/shops/${this.shopId}/sections`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey
        }
      });

      return response.data.results;
    } catch (error) {
      logger.error('Error getting shop sections', { error: error.message });
      throw error;
    }
  }

  async searchTaxonomy(query) {
    try {
      const url = `${this.baseURL}/application/seller-taxonomy/nodes`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey
        }
      });

      // Simple search through taxonomy
      const taxonomies = response.data.results;
      const matches = taxonomies.filter(tax => 
        tax.name.toLowerCase().includes(query.toLowerCase())
      );

      return matches;
    } catch (error) {
      logger.error('Error searching taxonomy', { error: error.message, query });
      throw error;
    }
  }

  async createCompleteProduct(productData, imagePaths) {
    try {
      logger.info('Creating complete product on Etsy', { 
        title: productData.title,
        imageCount: imagePaths.length 
      });

      // Get shipping templates and shop sections
      const [shippingTemplates, shopSections] = await Promise.all([
        this.getShippingTemplates(),
        this.getShopSections()
      ]);

      // Use first available shipping template
      const shippingTemplateId = shippingTemplates[0]?.shipping_template_id;
      if (!shippingTemplateId) {
        throw new Error('No shipping templates found. Please create one in your Etsy shop.');
      }

      // Find or use default shop section
      let shopSectionId = null;
      if (productData.category && shopSections.length > 0) {
        const section = shopSections.find(s => 
          s.title.toLowerCase().includes(productData.category.toLowerCase())
        );
        shopSectionId = section?.shop_section_id || shopSections[0].shop_section_id;
      }

      // Search for appropriate taxonomy
      let taxonomyId = 1; // Default fallback
      if (productData.categories && productData.categories.length > 0) {
        const taxonomyMatches = await this.searchTaxonomy(productData.categories[0]);
        if (taxonomyMatches.length > 0) {
          taxonomyId = taxonomyMatches[0].id;
        }
      }

      // Prepare listing data
      const listingData = {
        title: productData.title,
        description: productData.description,
        price: productData.price || 9.99,
        tags: productData.tags,
        quantity: productData.quantity || 1,
        shippingTemplateId,
        shopSectionId,
        taxonomyId,
        materials: productData.materials || ['Handmade'],
        processingMin: 1,
        processingMax: 3,
        shouldAutoRenew: true,
        isTaxable: true
      };

      // Create the listing
      const listing = await this.createListing(listingData);
      const listingId = listing.listing_id;

      // Upload images
      for (let i = 0; i < imagePaths.length; i++) {
        await this.uploadListingImage(listingId, imagePaths[i], i + 1);
        // Add delay between uploads to avoid rate limiting
        if (i < imagePaths.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Complete product created successfully', { 
        listingId,
        title: productData.title,
        imagesUploaded: imagePaths.length 
      });

      return {
        listingId,
        url: `https://www.etsy.com/listing/${listingId}`,
        title: productData.title
      };
    } catch (error) {
      logger.error('Error creating complete product', { 
        error: error.message,
        title: productData.title 
      });
      throw error;
    }
  }
}

module.exports = EtsyService;