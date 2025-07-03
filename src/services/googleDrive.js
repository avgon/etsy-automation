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
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading file', { error: error.message, fileId, fileName });
      throw error;
    }
  }

  async uploadFile(filePath, fileName, parentFolderId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId]
      };
      
      const media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(filePath)
      };
      
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });
      
      logger.info('File uploaded successfully', { fileId: response.data.id, fileName });
      return response.data.id;
    } catch (error) {
      logger.error('Error uploading file', { error: error.message, fileName });
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