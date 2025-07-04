const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class EtsySeleniumService {
  constructor() {
    this.driver = null;
    this.isLoggedIn = false;
    this.etsyEmail = process.env.ETSY_EMAIL;
    this.etsyPassword = process.env.ETSY_PASSWORD;
  }

  async initialize() {
    try {
      // Chrome options for headless browser  
      const options = new chrome.Options();
      
      // Railway/Production optimizations
      if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
        options.addArguments('--headless');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
        options.addArguments('--disable-extensions');
        options.addArguments('--disable-web-security');
        options.addArguments('--disable-features=VizDisplayCompositor');
        options.addArguments('--memory-pressure-off');
        options.addArguments('--max_old_space_size=4096');
      }
      
      options.addArguments('--window-size=1280,720'); // Smaller window for less memory
      options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Set Chrome binary path if available
      if (process.env.CHROME_BIN) {
        options.setChromeBinaryPath(process.env.CHROME_BIN);
      }

      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      await this.driver.manage().window().maximize();
      logger.info('Selenium WebDriver initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Error initializing Selenium WebDriver', { error: error.message });
      throw error;
    }
  }

  async loginToEtsy() {
    try {
      if (this.isLoggedIn) return true;

      logger.info('Logging in to Etsy');
      await this.driver.get('https://www.etsy.com/signin');
      
      // Wait for page load
      await this.driver.sleep(3000);

      // Fill email
      const emailField = await this.driver.wait(
        until.elementLocated(By.id('join_neu_email_field')),
        10000
      );
      await emailField.clear();
      await emailField.sendKeys(this.etsyEmail);

      // Fill password  
      const passwordField = await this.driver.findElement(By.id('join_neu_password_field'));
      await passwordField.clear();
      await passwordField.sendKeys(this.etsyPassword);

      // Click login button
      const loginButton = await this.driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      // Wait for login completion
      await this.driver.wait(until.urlContains('etsy.com'), 15000);
      
      // Check if we're on dashboard or need 2FA
      await this.driver.sleep(5000);
      const currentUrl = await this.driver.getCurrentUrl();
      
      if (currentUrl.includes('signin') || currentUrl.includes('2fa')) {
        throw new Error('Login failed - check credentials or 2FA required');
      }

      this.isLoggedIn = true;
      logger.info('Successfully logged in to Etsy');
      return true;

    } catch (error) {
      logger.error('Error logging in to Etsy', { error: error.message });
      throw error;
    }
  }

  async createListing(productData, imagePaths, sku) {
    try {
      await this.loginToEtsy();
      
      logger.info('Creating new Etsy listing', { sku, title: productData.title });

      // Go to shop manager
      await this.driver.get('https://www.etsy.com/your/shops/me/dashboard');
      await this.driver.sleep(3000);

      // Click "Add a listing" button
      const addListingButton = await this.driver.wait(
        until.elementLocated(By.css('a[href*="add"]')),
        10000
      );
      await addListingButton.click();
      await this.driver.sleep(3000);

      // Upload images
      await this.uploadImages(imagePaths, sku);

      // Fill listing details
      await this.fillListingDetails(productData, sku);

      // Set shipping and policies  
      await this.setShippingAndPolicies();

      // Publish listing
      const publishButton = await this.driver.findElement(By.css('button[data-test-id="publish-listing"]'));
      await publishButton.click();

      // Wait for success page
      await this.driver.wait(until.urlContains('listings'), 15000);
      const listingUrl = await this.driver.getCurrentUrl();

      logger.info('Etsy listing created successfully', { 
        sku,
        url: listingUrl 
      });

      return {
        success: true,
        url: listingUrl,
        sku: sku
      };

    } catch (error) {
      logger.error('Error creating Etsy listing', { 
        error: error.message,
        sku 
      });
      throw error;
    }
  }

  async uploadImages(imagePaths, sku) {
    try {
      logger.info('Uploading images to Etsy listing', { 
        sku, 
        imageCount: imagePaths.length 
      });

      // Find file upload input
      const fileInput = await this.driver.wait(
        until.elementLocated(By.css('input[type="file"]')),
        10000
      );

      // Upload multiple images at once
      const imagePathsString = imagePaths.slice(0, 10).join('\n'); // Max 10 images
      await fileInput.sendKeys(imagePathsString);

      // Wait for upload completion
      await this.driver.sleep(10000); // Give time for uploads

      logger.info('Images uploaded successfully', { sku });

    } catch (error) {
      logger.error('Error uploading images', { error: error.message, sku });
      throw error;
    }
  }

  async fillListingDetails(productData, sku) {
    try {
      logger.info('Filling listing details', { sku });

      // Title
      const titleField = await this.driver.wait(
        until.elementLocated(By.css('input[data-test-id="title"]')),
        10000
      );
      await titleField.clear();
      await titleField.sendKeys(productData.title);

      // Description
      const descriptionField = await this.driver.findElement(By.css('textarea[data-test-id="description"]'));
      await descriptionField.clear();
      await descriptionField.sendKeys(productData.description);

      // Price
      const priceField = await this.driver.findElement(By.css('input[data-test-id="price"]'));
      await priceField.clear();
      await priceField.sendKeys(productData.price.toString());

      // Tags
      if (productData.tags && productData.tags.length > 0) {
        const tagsField = await this.driver.findElement(By.css('input[data-test-id="tags"]'));
        await tagsField.clear();
        
        for (const tag of productData.tags.slice(0, 13)) {
          await tagsField.sendKeys(tag);
          await tagsField.sendKeys(Key.ENTER);
          await this.driver.sleep(500);
        }
      }

      // Quantity
      const quantityField = await this.driver.findElement(By.css('input[data-test-id="quantity"]'));
      await quantityField.clear();
      await quantityField.sendKeys((productData.quantity || 1).toString());

      logger.info('Listing details filled successfully', { sku });

    } catch (error) {
      logger.error('Error filling listing details', { error: error.message, sku });
      throw error;
    }
  }

  async setShippingAndPolicies() {
    try {
      // Use default shipping template
      const shippingDropdown = await this.driver.findElement(By.css('select[data-test-id="shipping-template"]'));
      await shippingDropdown.click();
      
      // Select first available option
      const firstOption = await this.driver.findElement(By.css('select[data-test-id="shipping-template"] option:nth-child(2)'));
      await firstOption.click();

      logger.info('Shipping and policies set');
    } catch (error) {
      logger.warn('Could not set shipping automatically - will use defaults', { error: error.message });
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      logger.info('Selenium WebDriver closed');
    }
  }
}

module.exports = EtsySeleniumService;