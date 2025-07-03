const path = require('path');
const fs = require('fs-extra');
const GoogleDriveService = require('./services/googleDrive');
const OpenAIService = require('./services/openai');
const ImageProcessor = require('./services/imageProcessor');
const EtsyService = require('./services/etsy');
const CSVExportService = require('./services/csvExport');
const EtsyBulkUploadService = require('./services/etsyBulkUpload');
const config = require('./config');
const logger = require('./utils/logger');

class EtsyAutomation {
  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.openai = new OpenAIService();
    this.imageProcessor = new ImageProcessor();
    this.etsy = new EtsyService();
    this.csvExporter = new CSVExportService();
    this.etsyBulkUploader = new EtsyBulkUploadService();
    this.processedFolders = new Set();
    this.workingDir = path.join(__dirname, '../temp');
    this.useEtsyAPI = false; // Manuel upload için CSV export kullan
  }

  async initialize() {
    try {
      // Create working directories
      await fs.ensureDir(this.workingDir);
      await fs.ensureDir(path.join(__dirname, '../logs'));
      
      logger.info('Etsy Automation initialized');
      
      // Start monitoring for new folders
      this.startMonitoring();
    } catch (error) {
      logger.error('Error initializing automation', { error: error.message });
      throw error;
    }
  }

  async startMonitoring() {
    logger.info('Starting folder monitoring');
    
    setInterval(async () => {
      try {
        await this.checkForNewFolders();
      } catch (error) {
        logger.error('Error in monitoring cycle', { error: error.message });
      }
    }, config.processing.processingInterval);

    // Initial check
    await this.checkForNewFolders();
  }

  async checkForNewFolders() {
    try {
      const folders = await this.googleDrive.pollForNewFolders();
      
      for (const folder of folders) {
        if (!this.processedFolders.has(folder.id)) {
          logger.info('New folder detected', { 
            folderId: folder.id, 
            folderName: folder.name 
          });
          
          await this.processFolder(folder);
          this.processedFolders.add(folder.id);
        }
      }
    } catch (error) {
      logger.error('Error checking for new folders', { error: error.message });
    }
  }

  async processFolder(folder) {
    try {
      logger.info('Processing folder', { folderId: folder.id, folderName: folder.name });
      
      // Generate SKU from folder name
      const sku = this.generateSKU(folder.name);
      logger.info('Generated SKU for product', { folderName: folder.name, sku });
      
      // Get images from folder
      const images = await this.googleDrive.getImagesFromFolder(folder.id);
      
      if (images.length === 0) {
        logger.info('No images found in folder', { folderId: folder.id });
        return;
      }

      // Create folder-specific working directory
      const folderWorkDir = path.join(this.workingDir, folder.id);
      await fs.ensureDir(folderWorkDir);

      const processedImages = [];
      
      // Process each image
      for (const image of images) {
        try {
          const processedImagePath = await this.processImage(image, folderWorkDir, folder.name);
          if (processedImagePath) {
            processedImages.push(processedImagePath);
          }
        } catch (error) {
          logger.error('Error processing individual image', { 
            error: error.message, 
            imageId: image.id, 
            imageName: image.name 
          });
        }
      }

      if (processedImages.length > 0) {
        // Generate SEO content with SKU and all processed images
        const seoContent = await this.generateSEOContent(folder.name, processedImages, sku);
        
        // Create Etsy listing with SKU
        await this.createEtsyListing(seoContent, processedImages, folder.name, sku);
      }

      // Copy processed images to exports before cleanup
      if (processedImages.length > 0) {
        const exportImagesDir = path.join(__dirname, '../exports/images', sku);
        await fs.ensureDir(exportImagesDir);
        
        for (const imagePath of processedImages) {
          const fileName = path.basename(imagePath);
          const destPath = path.join(exportImagesDir, fileName);
          await fs.copy(imagePath, destPath);
          logger.info('Processed image copied to exports', { imagePath, destPath });
        }
      }
      
      // Clean up working directory
      await fs.remove(folderWorkDir);
      
      logger.info('Folder processing completed', { 
        folderId: folder.id, 
        processedImages: processedImages.length,
        sku 
      });
      
    } catch (error) {
      logger.error('Error processing folder', { 
        error: error.message, 
        folderId: folder.id 
      });
    }
  }

  async processImage(image, workingDir, productType) {
    try {
      logger.info('Processing image', { imageId: image.id, imageName: image.name });
      
      // Download original image
      const originalPath = path.join(workingDir, `original_${image.name}`);
      await this.googleDrive.downloadFile(image.id, `original_${image.name}`, workingDir);
      
      let processedPath;
      
      // Check if background processing is enabled
      if (config.processing.addBackground) {
        // Add background first
        const backgroundPath = path.join(workingDir, `background_${image.name}`);
        
        const backgroundOptions = {
          type: config.processing.backgroundType,
          color: config.processing.backgroundColor,
          gradientColors: config.processing.gradientColors,
          backgroundImagePath: config.processing.backgroundImagePath,
          removeBackground: config.processing.removeBackground
        };
        
        await this.imageProcessor.addBackground(originalPath, backgroundPath, backgroundOptions);
        
        // Then resize the image with background
        processedPath = await this.imageProcessor.resizeImage(
          backgroundPath,
          path.join(workingDir, `processed_${image.name}`),
          3000
        );
        
        logger.info('Image processed with background', { 
          imageId: image.id, 
          backgroundType: config.processing.backgroundType,
          processedPath 
        });
      } else {
        // Skip background processing, just resize the original image
        processedPath = await this.imageProcessor.resizeImage(
          originalPath,
          path.join(workingDir, `processed_${image.name}`),
          3000
        );
        
        logger.info('Image processed without background', { 
          imageId: image.id, 
          processedPath 
        });
      }
      
      return processedPath;
    } catch (error) {
      logger.error('Error processing image', { 
        error: error.message, 
        imageId: image.id 
      });
      return null;
    }
  }

  async generateSEOContent(productName, imagePaths, sku) {
    try {
      logger.info('Generating SEO content', { productName, sku });
      
      const productInfo = {
        name: productName,
        type: this.inferProductType(productName),
        sku: sku
      };
      
      const seoContent = await this.openai.generateEtsySEO(
        productInfo, 
        imagePaths,
        config.openai.customGptId
      );
      
      // Add SKU to the SEO content
      seoContent.sku = sku;
      
      logger.info('SEO content generated', { title: seoContent.title, sku });
      
      return seoContent;
    } catch (error) {
      logger.error('Error generating SEO content', { error: error.message });
      throw error;
    }
  }

  async createEtsyListing(seoContent, imagePaths, productName, sku) {
    try {
      logger.info('Processing product for export', { title: seoContent.title, sku });
      
      const productData = {
        title: seoContent.title,
        description: seoContent.description + `\n\nSKU: ${sku}`,
        price: seoContent.priceRange ? parseFloat(seoContent.priceRange.split('-')[0]) : 19.99,
        tags: seoContent.tags,
        categories: seoContent.categories,
        quantity: 1,
        sku: sku
      };
      
      if (this.useEtsyAPI) {
        // Etsy API kullan (gelecekte)
        const result = await this.etsy.createCompleteProduct(productData, imagePaths);
        logger.info('Etsy listing created via API', { 
          listingId: result.listingId,
          url: result.url,
          sku 
        });
        return result;
      } else {
        // CSV export kullan
        const exportResult = await this.csvExporter.exportProduct(productData, imagePaths, sku);
        const guideFile = await this.csvExporter.createManualListingGuide(productData, sku);
        
        logger.info('Product exported for manual listing', { 
          sku,
          csvFile: exportResult.csvFile,
          guideFile,
          imageCount: exportResult.imageCount
        });
        
        console.log('\n🎉 ÜRÜN HAZIR!');
        console.log('📁 CSV Dosyası:', exportResult.csvFile);
        console.log('📋 Listeleme Rehberi:', guideFile);
        console.log('🖼️ İşlenmiş Görsel Sayısı:', exportResult.imageCount);
        console.log('🏷️ SKU:', sku);
        console.log('💰 Önerilen Fiyat:', productData.price, 'USD');
        console.log('\n📌 Manuel listeleme için exports klasörünü kontrol edin!');
        
        return {
          sku,
          exported: true,
          files: {
            csv: exportResult.csvFile,
            guide: guideFile,
            images: imagePaths
          }
        };
      }
    } catch (error) {
      logger.error('Error processing product', { error: error.message, sku });
      throw error;
    }
  }

  generateSKU(folderName) {
    // Clean folder name and create SKU
    const cleanName = folderName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toUpperCase()
      .substring(0, 20); // Limit length
    
    // Add timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    
    return `${cleanName}-${timestamp}`;
  }

  inferProductType(folderName) {
    const name = folderName.toLowerCase();
    
    if (name.includes('mug') || name.includes('cup')) return 'mug';
    if (name.includes('shirt') || name.includes('tshirt') || name.includes('tee')) return 'shirt';
    if (name.includes('poster') || name.includes('print')) return 'poster';
    if (name.includes('pillow') || name.includes('cushion')) return 'pillow';
    if (name.includes('bag') || name.includes('tote')) return 'bag';
    if (name.includes('phone') || name.includes('case')) return 'phone case';
    if (name.includes('sticker')) return 'sticker';
    if (name.includes('card')) return 'greeting card';
    
    return 'product'; // Default fallback
  }

  async shutdown() {
    logger.info('Shutting down Etsy Automation');
    
    // Clean up temp directory
    try {
      await fs.remove(this.workingDir);
    } catch (error) {
      logger.error('Error cleaning up temp directory', { error: error.message });
    }
  }
}

// Initialize and start the automation
const automation = new EtsyAutomation();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await automation.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await automation.shutdown();
  process.exit(0);
});

// Start the automation
automation.initialize().catch(error => {
  logger.error('Failed to initialize automation', { error: error.message });
  process.exit(1);
});

module.exports = EtsyAutomation;