const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class ImageProcessor {
  constructor() {
    this.outputSize = config.processing.outputImageSize;
  }

  async downloadImage(url, filePath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });

      await fs.ensureDir(path.dirname(filePath));
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading image', { error: error.message, url });
      throw error;
    }
  }

  async resizeImage(inputPath, outputPath, size = this.outputSize) {
    try {
      let finalSize = size;
      
      // Try 3000x3000 first, fallback to 2000x2000 if needed
      try {
        await sharp(inputPath)
          .resize(finalSize, finalSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .jpeg({ quality: 90 })
          .toFile(outputPath);
      } catch (sizeError) {
        if (finalSize === 3000) {
          logger.warn('3000x3000 failed, trying 2000x2000', { inputPath });
          finalSize = 2000;
          await sharp(inputPath)
            .resize(finalSize, finalSize, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 90 })
            .toFile(outputPath);
        } else {
          throw sizeError;
        }
      }

      logger.info('Image resized successfully', { 
        inputPath, 
        outputPath, 
        size: `${finalSize}x${finalSize}`,
        fallback: finalSize !== size
      });
      
      return outputPath;
    } catch (error) {
      logger.error('Error resizing image', { error: error.message, inputPath });
      throw error;
    }
  }

  async combineWithShowcase(productImagePath, showcaseImagePath, outputPath) {
    try {
      // Load both images
      const productImage = sharp(productImagePath);
      const showcaseImage = sharp(showcaseImagePath);
      
      // Get product image metadata
      const { width, height } = await productImage.metadata();
      
      // Resize showcase to match our target size
      const resizedShowcase = await showcaseImage
        .resize(this.outputSize, this.outputSize, { fit: 'cover' })
        .png()
        .toBuffer();
      
      // Calculate product image size - smaller for lifestyle shots (30% of canvas)
      const maxProductSize = Math.floor(this.outputSize * 0.3);
      const scaleFactor = Math.min(maxProductSize / width, maxProductSize / height, 1);
      const newWidth = Math.floor(width * scaleFactor);
      const newHeight = Math.floor(height * scaleFactor);
      
      // Process product image with enhanced contrast for overlay
      const resizedProduct = await productImage
        .resize(newWidth, newHeight, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .sharpen()
        .modulate({ brightness: 1.1, saturation: 1.2 }) // Enhance for overlay
        .png()
        .toBuffer();
      
      // Position product in a corner or strategic location (not center)
      const left = Math.floor(this.outputSize * 0.65); // Right side
      const top = Math.floor(this.outputSize * 0.15);  // Upper area
      
      // Combine images with enhanced blending for lifestyle effect
      await sharp(resizedShowcase)
        .composite([{
          input: resizedProduct,
          left: left,
          top: top,
          blend: 'over'
        }])
        .jpeg({ quality: 95 })
        .toFile(outputPath);
      
      logger.info('Product combined with lifestyle showcase', { 
        productImagePath, 
        showcaseImagePath, 
        outputPath,
        productSize: `${newWidth}x${newHeight}`,
        scaleFactor,
        position: `${left}x${top}`
      });
      
      return outputPath;
    } catch (error) {
      logger.error('Error combining with showcase', { error: error.message });
      throw error;
    }
  }

  async processProductWithShowcase(productImagePath, showcaseUrl, outputDir, fileName) {
    try {
      const tempDir = path.join(outputDir, 'temp');
      await fs.ensureDir(tempDir);
      
      // Download showcase image
      const showcasePath = path.join(tempDir, `showcase_${fileName}`);
      await this.downloadImage(showcaseUrl, showcasePath);
      
      // Combine with lifestyle showcase
      const combinedPath = path.join(tempDir, `lifestyle_${fileName}`);
      await this.combineWithShowcase(productImagePath, showcasePath, combinedPath);
      
      // Final resize to exact dimensions
      const finalPath = path.join(outputDir, `lifestyle_${fileName}`);
      await this.resizeImage(combinedPath, finalPath);
      
      // Clean up temp files
      await fs.remove(tempDir);
      
      logger.info('Product lifestyle showcase created successfully', { 
        input: productImagePath, 
        output: finalPath,
        type: 'lifestyle_showcase'
      });
      
      return finalPath;
    } catch (error) {
      logger.error('Error creating lifestyle showcase', { error: error.message });
      throw error;
    }
  }

  async addProductToBackground(productImagePath, backgroundImagePath, outputPath) {
    try {
      // Load background image and resize to output size first
      const background = await sharp(backgroundImagePath)
        .resize(this.outputSize, this.outputSize, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      // Load product image - keep original without background removal
      const product = sharp(productImagePath);
      const productMetadata = await product.metadata();
      
      // Calculate product size: 45% of the final output canvas area
      const targetArea = (this.outputSize * this.outputSize) * 0.45;
      const aspectRatio = productMetadata.width / productMetadata.height;
      
      let newWidth, newHeight;
      if (aspectRatio >= 1) {
        // Landscape or square
        newWidth = Math.floor(Math.sqrt(targetArea * aspectRatio));
        newHeight = Math.floor(newWidth / aspectRatio);
      } else {
        // Portrait
        newHeight = Math.floor(Math.sqrt(targetArea / aspectRatio));
        newWidth = Math.floor(newHeight * aspectRatio);
      }
      
      // Resize product
      const resizedProduct = await product
        .resize(newWidth, newHeight, { 
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      
      // Calculate exact center position
      const left = Math.floor((this.outputSize - newWidth) / 2);
      const top = Math.floor((this.outputSize - newHeight) / 2);
      
      // Create shadow (very subtle)
      const shadowOffset = Math.floor(newWidth * 0.02); // 2% of product width
      const shadowBlur = Math.floor(newWidth * 0.03);   // 3% of product width
      
      const shadow = await sharp(resizedProduct)
        .modulate({ brightness: 0.3 }) // Dark shadow
        .blur(shadowBlur)
        .png()
        .toBuffer();
      
      // Composite shadow first, then product onto background
      await sharp(background)
        .composite([
          {
            input: shadow,
            left: left + shadowOffset,
            top: top + shadowOffset,
            blend: 'multiply'
          },
          {
            input: resizedProduct,
            left: left,
            top: top,
            blend: 'over'
          }
        ])
        .jpeg({ quality: 95 })
        .toFile(outputPath);
      
      logger.info('Product added to background successfully', {
        productImagePath,
        backgroundImagePath,
        outputPath,
        productSize: `${newWidth}x${newHeight}`,
        position: `${left}x${top}`,
        canvasSize: `${this.outputSize}x${this.outputSize}`,
        areaPercentage: ((newWidth * newHeight) / (this.outputSize * this.outputSize) * 100).toFixed(1) + '%'
      });
      
      return outputPath;
    } catch (error) {
      logger.error('Error adding product to background', { error: error.message });
      throw error;
    }
  }

  async createGradientBackground(colors, width, height) {
    try {
      // Create a simple vertical gradient using SVG
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" />
        </svg>
      `;
      
      return sharp(Buffer.from(svg));
    } catch (error) {
      logger.error('Error creating gradient background', { error: error.message });
      throw error;
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  interpolateColor(color1, color2, ratio) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  async selectRandomBackground(backgroundPath) {
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      // Check if it's a file or directory
      const stats = await fs.stat(backgroundPath);
      
      if (stats.isFile()) {
        return backgroundPath;
      } else if (stats.isDirectory()) {
        // Read all image files from directory
        const files = await fs.readdir(backgroundPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        });
        
        if (imageFiles.length === 0) {
          throw new Error('No image files found in background directory');
        }
        
        // Select random image
        const randomIndex = Math.floor(Math.random() * imageFiles.length);
        return path.join(backgroundPath, imageFiles[randomIndex]);
      }
    } catch (error) {
      logger.error('Error selecting random background', { error: error.message, backgroundPath });
      throw error;
    }
  }

  async createThumbnail(imagePath, outputPath, size = 400) {
    try {
      await sharp(imagePath)
        .resize(size, size, {
          fit: 'cover'
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      logger.error('Error creating thumbnail', { error: error.message });
      throw error;
    }
  }
}

module.exports = ImageProcessor;