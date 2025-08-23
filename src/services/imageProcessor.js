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

  async addProductToBackground(productImagePath, backgroundImagePath, outputPath, productType = null) {
    try {
      // Load background image and resize to output size first  
      const background = await sharp(backgroundImagePath)
        .resize(this.outputSize, this.outputSize, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      // Load product image with transparent background removal
      const product = sharp(productImagePath);
      const productMetadata = await product.metadata();
      
      // For your specific backgrounds (Back1, Back2, Back3), use optimized positioning
      const backgroundName = require('path').basename(backgroundImagePath);
      let productSize, leftPos, topPos;
      
      // Ürün tipini belirle (file adından veya productType parametresinden)
      const fileName = require('path').basename(productImagePath).toLowerCase();
      let detectedProductType = productType;
      
      if (!detectedProductType) {
        if (fileName.includes('necklace') || fileName.includes('pendant') || fileName.includes('kolye')) {
          detectedProductType = 'necklace';
        } else if (fileName.includes('ring') || fileName.includes('yüzük') || fileName.includes('yuzuk')) {
          detectedProductType = 'ring';
        }
      }
      
      if (backgroundName.startsWith('Back')) {
        // Ürün tipine göre boyutlandırma
        let targetAreaPercentage;
        
        if (detectedProductType === 'necklace' || detectedProductType === 'pendant') {
          // Kolye/Pendant için büyük boyut (yüzükten 400% daha büyük görünüm)
          targetAreaPercentage = 1.2; // 120% of canvas area (makul büyük görünüm)
          logger.info('Using large necklace/pendant sizing for backgrounds', { 
            productType: detectedProductType, 
            areaPercentage: targetAreaPercentage * 100 
          });
        } else if (detectedProductType === 'ring') {
          // Yüzük için normal boyut
          targetAreaPercentage = 0.75; // 75% of canvas area (mevcut)
          logger.info('Using normal ring sizing for backgrounds', { 
            productType: detectedProductType, 
            areaPercentage: targetAreaPercentage * 100 
          });
        } else {
          // Diğer ürünler için varsayılan
          targetAreaPercentage = 0.75; // 75% of canvas area
          logger.info('Using default sizing for backgrounds', { 
            productType: detectedProductType || 'unknown', 
            areaPercentage: targetAreaPercentage * 100 
          });
        }
        
        const targetArea = (this.outputSize * this.outputSize) * targetAreaPercentage;
        const aspectRatio = productMetadata.width / productMetadata.height;
        
        // Calculate dimensions to achieve 75% area coverage
        const targetDimension = Math.sqrt(targetArea);
        
        if (aspectRatio >= 1) {
          // Landscape or square - limit by width
          productSize = { 
            width: Math.floor(targetDimension * Math.sqrt(aspectRatio)),
            height: Math.floor(targetDimension / Math.sqrt(aspectRatio))
          };
        } else {
          // Portrait - limit by height  
          productSize = { 
            height: Math.floor(targetDimension / Math.sqrt(aspectRatio)),
            width: Math.floor(targetDimension * Math.sqrt(aspectRatio))
          };
        }
        
        // Ensure minimum size for visibility but never exceed canvas
        const minSize = Math.floor(this.outputSize * 0.70); // At least 70% of canvas dimension
        const maxSize = Math.floor(this.outputSize * 0.95); // Never exceed 95% of canvas dimension
        
        // Apply minimum size constraint if needed
        if (productSize.width < minSize && productSize.height < minSize) {
          const scale = minSize / Math.max(productSize.width, productSize.height);
          productSize.width = Math.floor(productSize.width * scale);
          productSize.height = Math.floor(productSize.height * scale);
        }
        
        // Apply maximum size constraint to prevent composite errors
        if (productSize.width > maxSize || productSize.height > maxSize) {
          const scale = maxSize / Math.max(productSize.width, productSize.height);
          productSize.width = Math.floor(productSize.width * scale);
          productSize.height = Math.floor(productSize.height * scale);
        }
        
        // Center the product (50% from left, 50% from top)
        leftPos = Math.floor((this.outputSize - productSize.width) / 2);
        topPos = Math.floor((this.outputSize - productSize.height) / 2);
        
      } else {
        // Original sizing for other backgrounds
        const targetArea = (this.outputSize * this.outputSize) * 0.45;
        const aspectRatio = productMetadata.width / productMetadata.height;
        
        if (aspectRatio >= 1) {
          productSize = { 
            width: Math.floor(Math.sqrt(targetArea * aspectRatio)),
            height: Math.floor(Math.sqrt(targetArea * aspectRatio) / aspectRatio)
          };
        } else {
          productSize = { 
            height: Math.floor(Math.sqrt(targetArea / aspectRatio)),
            width: Math.floor(Math.sqrt(targetArea / aspectRatio) * aspectRatio)
          };
        }
        
        // Center position for other backgrounds
        leftPos = Math.floor((this.outputSize - productSize.width) / 2);
        topPos = Math.floor((this.outputSize - productSize.height) / 2);
      }
      
      // Resize product with background removal
      const resizedProduct = await product
        .resize(productSize.width, productSize.height, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();
      
      // Create subtle shadow only for Back backgrounds
      let compositeOperations;
      if (backgroundName.startsWith('Back')) {
        // Simple composite without shadow for cleaner look
        compositeOperations = [
          {
            input: resizedProduct,
            left: leftPos,
            top: topPos,
            blend: 'over'
          }
        ];
      } else {
        // Original shadow for other backgrounds
        const shadowOffset = Math.floor(productSize.width * 0.02);
        const shadowBlur = Math.floor(productSize.width * 0.03);
        
        const shadow = await sharp(resizedProduct)
          .modulate({ brightness: 0.3 })
          .blur(shadowBlur)
          .png()
          .toBuffer();
          
        compositeOperations = [
          {
            input: shadow,
            left: leftPos + shadowOffset,
            top: topPos + shadowOffset,
            blend: 'multiply'
          },
          {
            input: resizedProduct,
            left: leftPos,
            top: topPos,
            blend: 'over'
          }
        ];
      }
      
      // Composite onto background
      await sharp(background)
        .composite(compositeOperations)
        .jpeg({ quality: 95 })
        .toFile(outputPath);
      
      logger.info('Product added to background successfully', {
        productImagePath,
        backgroundImagePath,
        outputPath,
        productSize: `${productSize.width}x${productSize.height}`,
        position: `${leftPos}x${topPos}`,
        canvasSize: `${this.outputSize}x${this.outputSize}`,
        backgroundType: backgroundName,
        areaPercentage: ((productSize.width * productSize.height) / (this.outputSize * this.outputSize) * 100).toFixed(1) + '%'
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

  async addBackground(inputPath, outputPath, options = {}) {
    try {
      const backgroundsDir = path.join(__dirname, '../../test-backgrounds');
      const availableBackgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
      
      // Use specified background or default to Back1
      const selectedBackground = options.backgroundName || 'Back1.jpg';
      const backgroundPath = path.join(backgroundsDir, selectedBackground);
      
      // Check if background file exists
      if (!await fs.pathExists(backgroundPath)) {
        logger.warn('Background file not found, using white background', { backgroundPath });
        // Fallback to white background
        return await this.resizeImage(inputPath, outputPath, this.outputSize);
      }
      
      logger.info('Adding background to product image', { 
        inputPath, 
        outputPath, 
        selectedBackground,
        backgroundPath,
        productType: options.productType 
      });
      
      // Use the addProductToBackground method with productType
      return await this.addProductToBackground(inputPath, backgroundPath, outputPath, options.productType);
      
    } catch (error) {
      logger.error('Error adding background', { error: error.message, inputPath });
      // Fallback to just resizing without background
      return await this.resizeImage(inputPath, outputPath, this.outputSize);
    }
  }

  async createAllBackgroundCombinations(inputPath, outputDir, fileName, productType = null) {
    try {
      const backgroundsDir = path.join(__dirname, '../../test-backgrounds');
      const availableBackgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
      const results = [];
      
      // Create combinations with each background
      for (const background of availableBackgrounds) {
        const backgroundPath = path.join(backgroundsDir, background);
        
        if (await fs.pathExists(backgroundPath)) {
          const backgroundName = path.basename(background, path.extname(background));
          const outputPath = path.join(outputDir, `${backgroundName}_${fileName}`);
          
          await this.addProductToBackground(inputPath, backgroundPath, outputPath, productType);
          results.push({
            backgroundName,
            outputPath
          });
          
          logger.info('Created background combination', { 
            inputPath, 
            outputPath, 
            background,
            backgroundName,
            productType 
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error creating background combinations', { error: error.message, inputPath });
      throw error;
    }
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