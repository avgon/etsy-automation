const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    
    this.oauth2Client.setCredentials({
      refresh_token: config.google.refreshToken
    });
    
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async watchFolder(folderId) {
    try {
      const response = await this.drive.files.watch({
        fileId: folderId,
        requestBody: {
          id: `watch-${Date.now()}`,
          type: 'web_hook',
          address: 'https://your-webhook-url.com/webhook'
        }
      });
      
      logger.info('Folder watch setup successfully', { response: response.data });
      return response.data;
    } catch (error) {
      logger.error('Error setting up folder watch', { error: error.message });
      throw error;
    }
  }

  async getSubfolders(parentFolderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name, createdTime)'
      });
      
      return response.data.files;
    } catch (error) {
      logger.error('Error getting subfolders', { error: error.message });
      throw error;
    }
  }

  async getImagesFromFolder(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/')`,
        fields: 'files(id, name, mimeType, size)'
      });
      
      return response.data.files;
    } catch (error) {
      logger.error('Error getting images from folder', { error: error.message });
      throw error;
    }
  }

  async downloadFile(fileId, fileName, downloadPath) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });
      
      const filePath = path.join(downloadPath, fileName);
      await fs.ensureDir(path.dirname(filePath));
      
      const writer = fs.createWriteStream(filePath);
      
      // FIXED: Proper promise handling for stream completion
      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });
      
      // Verify file exists and has content
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      logger.info('File downloaded successfully', { 
        fileId, 
        fileName, 
        filePath,
        size: stats.size 
      });
      
      return filePath;
    } catch (error) {
      logger.error('Error downloading file', { error: error.message, fileId, fileName });
      throw error;
    }
  }

  async uploadFile(filePath, fileName, parentFolderId, mimeType = null) {
    try {
      // Auto-detect MIME type based on file extension
      if (!mimeType) {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            mimeType = 'image/jpeg';
            break;
          case '.png':
            mimeType = 'image/png';
            break;
          case '.csv':
            mimeType = 'text/csv';
            break;
          case '.json':
            mimeType = 'application/json';
            break;
          case '.md':
            mimeType = 'text/markdown';
            break;
          default:
            mimeType = 'application/octet-stream';
        }
      }
      
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId]
      };
      
      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };
      
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });
      
      logger.info('File uploaded successfully', { fileId: response.data.id, fileName, mimeType });
      return response.data.id;
    } catch (error) {
      logger.error('Error uploading file', { error: error.message, fileName });
      throw error;
    }
  }

  async createFolder(folderName, parentFolderId) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };
      
      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });
      
      logger.info('Folder created successfully', { folderId: response.data.id, folderName });
      return response.data.id;
    } catch (error) {
      logger.error('Error creating folder', { error: error.message, folderName });
      throw error;
    }
  }

  async uploadProcessedFiles(sku, exportPath, productFolderId) {
    try {
      console.log('🔍 Upload to product folder:', productFolderId, 'SKU:', sku);
      
      // Check if "processed" folder already exists in THIS PRODUCT folder, if not create it
      let processedFolderId;
      try {
        const existingFolders = await this.getSubfolders(productFolderId);
        console.log('🔍 Existing subfolders in product:', existingFolders.length);
        
        const processedFolder = existingFolders.find(f => f.name === 'processed');
        
        if (processedFolder) {
          processedFolderId = processedFolder.id;
          console.log('✅ Using existing processed folder in product:', processedFolderId);
          logger.info('Using existing processed folder in product', { processedFolderId, productFolderId });
        } else {
          processedFolderId = await this.createFolder('processed', productFolderId);
          console.log('✅ Created new processed folder in product:', processedFolderId);
          logger.info('Created new processed folder in product', { processedFolderId, productFolderId });
        }
      } catch (error) {
        console.log('❌ Error finding subfolders, creating new processed folder');
        processedFolderId = await this.createFolder('processed', productFolderId);
      }
      
      const uploadResults = [];
      
      // Upload CSV file for this specific product
      const csvPath = path.join(exportPath, 'etsy-products.csv');
      if (await fs.pathExists(csvPath)) {
        const csvFileId = await this.uploadFile(csvPath, `${sku}-products.csv`, processedFolderId);
        uploadResults.push({ type: 'csv', fileId: csvFileId });
      }
      
      // Upload processed images (no SKU prefix needed since each product has its own folder)
      const imagesDir = path.join(exportPath, 'images', sku);
      if (await fs.pathExists(imagesDir)) {
        const imageFiles = await fs.readdir(imagesDir);
        
        for (const imageFile of imageFiles) {
          const imagePath = path.join(imagesDir, imageFile);
          // No SKU prefix needed - each product has its own processed folder
          const cleanFileName = imageFile.replace(`processed_`, '');
          const imageFileId = await this.uploadFile(imagePath, cleanFileName, processedFolderId);
          uploadResults.push({ type: 'image', fileId: imageFileId, fileName: cleanFileName });
        }
      }
      
      logger.info('Files uploaded to product-specific processed folder', { 
        sku, 
        processedFolderId, 
        uploadCount: uploadResults.length,
        uploads: uploadResults
      });
      
      return {
        processedFolderId,
        uploads: uploadResults
      };
    } catch (error) {
      logger.error('Error uploading to processed folder', { error: error.message, sku });
      throw error;
    }
  }

  async pollForNewFolders() {
    try {
      const folders = await this.getSubfolders(config.google.driveFolderId);
      return folders;
    } catch (error) {
      logger.error('Error polling for new folders', { error: error.message });
      throw error;
    }
  }
}

module.exports = GoogleDriveService;