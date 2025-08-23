const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const OpenAI = require('openai');

class IntelligentImageProcessor {
  constructor() {
    this.outputSize = config.processing.outputImageSize;
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * AI-powered background analysis
   * Describes background style, color scheme, and optimal positioning areas
   */
  async analyzeBackground(backgroundImagePath) {
    try {
      // Convert image to base64 for OpenAI Vision
      const imageBuffer = await sharp(backgroundImagePath)
        .resize(512, 512, { fit: 'inside' }) // Optimize for API
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const base64Image = imageBuffer.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this background image and provide a JSON response with:
                {
                  "style": "descriptive style (e.g. 'luxury marble', 'minimal white', 'textured fabric')",
                  "colorScheme": "dominant colors and mood (e.g. 'warm gold tones', 'cool silver gradients')",
                  "optimalRegions": {
                    "primary": "best area for main product (e.g. 'center', 'upper-center', 'left-center')",
                    "secondary": "alternative placement areas",
                    "avoid": "areas to avoid due to busy patterns or text"
                  },
                  "lightingDirection": "where light appears to come from (e.g. 'top-left', 'diffused', 'rim-lit')",
                  "productSuitability": {
                    "jewelry": "how well suited for jewelry (1-10)",
                    "smallItems": "suitability for small detailed items (1-10)",
                    "largeItems": "suitability for larger products (1-10)"
                  },
                  "suggestedPositioning": "specific positioning advice for different product types"
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      let content = response.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      const analysis = JSON.parse(content);
      
      logger.info('Background analyzed successfully', { 
        backgroundImagePath,
        style: analysis.style,
        optimalRegions: analysis.optimalRegions.primary
      });
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing background', { error: error.message });
      // Fallback to basic analysis
      return {
        style: 'standard background',
        colorScheme: 'neutral tones',
        optimalRegions: { primary: 'center' },
        lightingDirection: 'diffused',
        productSuitability: { jewelry: 7, smallItems: 7, largeItems: 7 },
        suggestedPositioning: 'center with standard sizing'
      };
    }
  }

  /**
   * AI-powered product analysis
   * Identifies product type, dimensions, chain length, and optimal positioning
   */
  async analyzeProduct(productImagePath) {
    try {
      // Convert image to base64 for OpenAI Vision
      const imageBuffer = await sharp(productImagePath)
        .resize(512, 512, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const base64Image = imageBuffer.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this product image and provide a JSON response with:
                {
                  "productType": "specific type (e.g. 'necklace', 'pendant_necklace', 'ring', 'bracelet', 'earrings', 'watch')",
                  "subType": "more specific classification (e.g. 'chain_necklace', 'statement_ring', 'drop_earrings')",
                  "dimensions": {
                    "aspectRatio": "width:height ratio estimate",
                    "primaryDimension": "which dimension is more important ('width', 'height', 'balanced')"
                  },
                  "chainInfo": {
                    "hasChain": true/false,
                    "chainLength": "estimated chain length relative to pendant ('short', 'medium', 'long')",
                    "chainStyle": "chain type if visible ('delicate', 'chunky', 'rope', 'box')",
                    "chainVisibility": "how much of chain is visible ('full', 'partial', 'minimal')"
                  },
                  "visualFocus": {
                    "mainElement": "what should be the focal point",
                    "size": "estimated relative size category ('tiny', 'small', 'medium', 'large', 'statement')",
                    "detail": "level of fine detail ('high', 'medium', 'low')"
                  },
                  "positioningNeeds": {
                    "preferredOrientation": "best orientation ('portrait', 'landscape', 'square')",
                    "marginRequirements": "space needed around product ('minimal', 'moderate', 'generous')",
                    "specialConsiderations": "any special positioning needs (e.g. 'show full chain length', 'emphasize detail', 'maintain proportions')"
                  },
                  "backgroundCompatibility": {
                    "bestBackgrounds": ["types of backgrounds that work best"],
                    "avoidBackgrounds": ["background types to avoid"]
                  }
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      let content = response.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      const analysis = JSON.parse(content);
      
      logger.info('Product analyzed successfully', { 
        productImagePath,
        productType: analysis.productType,
        hasChain: analysis.chainInfo?.hasChain,
        chainLength: analysis.chainInfo?.chainLength
      });
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing product', { error: error.message });
      // Fallback to filename-based detection
      const fileName = path.basename(productImagePath).toLowerCase();
      let productType = 'unknown';
      let hasChain = false;
      
      if (fileName.includes('necklace') || fileName.includes('kolye') || 
          fileName.includes('clawrio') || fileName.includes('pendant') ||
          fileName.includes('chain') || fileName.includes('star')) {
        productType = 'necklace';
        hasChain = true;
      } else if (fileName.includes('ring') || fileName.includes('yüzük')) {
        productType = 'ring';
      }
      
      return {
        productType,
        subType: productType,
        dimensions: { aspectRatio: '1:1', primaryDimension: 'balanced' },
        chainInfo: { hasChain, chainLength: 'medium', chainStyle: 'delicate', chainVisibility: 'partial' },
        visualFocus: { mainElement: 'product', size: 'medium', detail: 'medium' },
        positioningNeeds: { preferredOrientation: 'square', marginRequirements: 'moderate', specialConsiderations: 'standard positioning' },
        backgroundCompatibility: { bestBackgrounds: ['any'], avoidBackgrounds: [] }
      };
    }
  }

  /**
   * Intelligent positioning algorithm
   * Combines background and product analysis to determine optimal placement
   */
  calculateOptimalPositioning(backgroundAnalysis, productAnalysis, canvasSize) {
    try {
      let positioning = {
        size: { width: 0, height: 0 },
        position: { left: 0, top: 0 },
        strategy: 'standard'
      };

      // Base sizing on product type and background suitability
      let baseSizePercentage = 0.75; // Default 75% of canvas area

      // Adjust based on product type
      if (productAnalysis.productType === 'necklace' || productAnalysis.productType === 'pendant_necklace') {
        if (productAnalysis.chainInfo?.hasChain) {
          // Chain necklaces need more vertical space
          if (productAnalysis.chainInfo.chainLength === 'long') {
            baseSizePercentage = 1.4; // 140% for long chains - extends beyond canvas
            positioning.strategy = 'chain_vertical_extend';
          } else if (productAnalysis.chainInfo.chainLength === 'medium') {
            baseSizePercentage = 1.1; // 110% for medium chains
            positioning.strategy = 'chain_vertical';
          } else {
            baseSizePercentage = 0.9; // 90% for short chains
            positioning.strategy = 'chain_compact';
          }
        } else {
          // Pendants without chains
          baseSizePercentage = 0.8;
          positioning.strategy = 'pendant_centered';
        }
      } else if (productAnalysis.productType === 'ring') {
        // Rings need precise centering and good detail visibility
        baseSizePercentage = 0.7; // 70% to show detail clearly
        positioning.strategy = 'ring_centered';
      } else if (productAnalysis.visualFocus?.size === 'statement') {
        baseSizePercentage = 0.85; // Larger for statement pieces
        positioning.strategy = 'statement_piece';
      }

      // Adjust based on background compatibility
      const jewelryScore = backgroundAnalysis.productSuitability?.jewelry || 7;
      if (jewelryScore >= 8) {
        baseSizePercentage *= 1.1; // Increase size on jewelry-friendly backgrounds
      } else if (jewelryScore <= 5) {
        baseSizePercentage *= 0.9; // Decrease size on busy backgrounds
      }

      // Calculate actual dimensions
      const targetArea = (canvasSize * canvasSize) * baseSizePercentage;
      
      // Estimate aspect ratio from product analysis
      let aspectRatio = 1; // Default square
      if (productAnalysis.dimensions?.aspectRatio) {
        const ratioStr = productAnalysis.dimensions.aspectRatio;
        if (ratioStr.includes(':')) {
          const [w, h] = ratioStr.split(':').map(Number);
          aspectRatio = w / h;
        }
      }

      // Special handling for chain necklaces
      if (positioning.strategy.includes('chain')) {
        // Prioritize height for chains
        if (aspectRatio >= 1) {
          // Wide necklace - ensure full chain is visible
          positioning.size.height = Math.min(Math.floor(Math.sqrt(targetArea / aspectRatio)), canvasSize * 1.2);
          positioning.size.width = Math.floor(positioning.size.height * aspectRatio);
        } else {
          // Tall necklace - maximize height
          positioning.size.height = Math.floor(Math.sqrt(targetArea / aspectRatio));
          positioning.size.width = Math.floor(positioning.size.height * aspectRatio);
        }
      } else {
        // Standard calculation for non-chain items
        const targetDimension = Math.sqrt(targetArea);
        
        if (aspectRatio >= 1) {
          positioning.size.width = Math.floor(targetDimension * Math.sqrt(aspectRatio));
          positioning.size.height = Math.floor(targetDimension / Math.sqrt(aspectRatio));
        } else {
          positioning.size.height = Math.floor(targetDimension / Math.sqrt(aspectRatio));
          positioning.size.width = Math.floor(targetDimension * Math.sqrt(aspectRatio));
        }
      }

      // Ensure minimum and maximum constraints
      const minSize = Math.floor(canvasSize * 0.4);
      const maxWidth = Math.floor(canvasSize * 0.95);
      const maxHeight = Math.floor(canvasSize * 1.2); // Allow height overflow for chains

      positioning.size.width = Math.max(minSize, Math.min(positioning.size.width, maxWidth));
      positioning.size.height = Math.max(minSize, positioning.size.height);

      // For chains, don't limit height as strictly
      if (!positioning.strategy.includes('chain')) {
        positioning.size.height = Math.min(positioning.size.height, maxHeight);
      }

      // Calculate position based on background analysis and product needs
      let leftPos, topPos;

      // Use background optimal regions
      const primaryRegion = backgroundAnalysis.optimalRegions?.primary || 'center';
      
      if (positioning.strategy.includes('chain')) {
        // Chains often look best slightly higher to show full length
        leftPos = Math.floor((canvasSize - positioning.size.width) / 2);
        topPos = Math.floor((canvasSize - positioning.size.height) / 2.2); // Slightly higher
        
        // For extending chains, start from top
        if (positioning.strategy === 'chain_vertical_extend') {
          topPos = Math.floor(canvasSize * 0.05); // Start near top
        }
      } else if (primaryRegion.includes('center')) {
        leftPos = Math.floor((canvasSize - positioning.size.width) / 2);
        topPos = Math.floor((canvasSize - positioning.size.height) / 2);
      } else if (primaryRegion.includes('upper')) {
        leftPos = Math.floor((canvasSize - positioning.size.width) / 2);
        topPos = Math.floor(canvasSize * 0.3);
      } else if (primaryRegion.includes('left')) {
        leftPos = Math.floor(canvasSize * 0.3);
        topPos = Math.floor((canvasSize - positioning.size.height) / 2);
      } else if (primaryRegion.includes('right')) {
        leftPos = Math.floor(canvasSize * 0.7 - positioning.size.width);
        topPos = Math.floor((canvasSize - positioning.size.height) / 2);
      } else {
        // Default center
        leftPos = Math.floor((canvasSize - positioning.size.width) / 2);
        topPos = Math.floor((canvasSize - positioning.size.height) / 2);
      }

      positioning.position = { left: leftPos, top: topPos };

      logger.info('Optimal positioning calculated', {
        strategy: positioning.strategy,
        size: `${positioning.size.width}x${positioning.size.height}`,
        position: `${leftPos},${topPos}`,
        baseSizePercentage: (baseSizePercentage * 100).toFixed(1) + '%',
        primaryRegion
      });

      return positioning;
    } catch (error) {
      logger.error('Error calculating positioning', { error: error.message });
      // Fallback to center positioning
      const defaultSize = Math.floor(canvasSize * 0.75);
      return {
        size: { width: defaultSize, height: defaultSize },
        position: { 
          left: Math.floor((canvasSize - defaultSize) / 2),
          top: Math.floor((canvasSize - defaultSize) / 2)
        },
        strategy: 'fallback_center'
      };
    }
  }

  /**
   * Main intelligent processing method
   * Combines AI analysis with optimal positioning
   */
  async processProductWithIntelligentBackground(productImagePath, backgroundImagePath, outputPath) {
    try {
      logger.info('Starting intelligent image processing', { 
        productImagePath, 
        backgroundImagePath, 
        outputPath 
      });

      // Step 1: Analyze background and product simultaneously
      const [backgroundAnalysis, productAnalysis] = await Promise.all([
        this.analyzeBackground(backgroundImagePath),
        this.analyzeProduct(productImagePath)
      ]);

      // Step 2: Calculate optimal positioning
      const positioning = this.calculateOptimalPositioning(
        backgroundAnalysis, 
        productAnalysis, 
        this.outputSize
      );

      // Step 3: Load and prepare images
      const background = await sharp(backgroundImagePath)
        .resize(this.outputSize, this.outputSize, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toBuffer();

      const product = sharp(productImagePath);
      const productMetadata = await product.metadata();

      // Step 4: Apply intelligent resizing and positioning
      const resizedProduct = await product
        .resize(positioning.size.width, positioning.size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();

      // Step 5: Create composite with optimal settings
      let compositeOperations = [
        {
          input: resizedProduct,
          left: positioning.position.left,
          top: positioning.position.top,
          blend: 'over'
        }
      ];

      // Add subtle shadow for better integration (only for supported backgrounds)
      if (backgroundAnalysis.style !== 'minimal white' && productAnalysis.visualFocus?.detail !== 'high') {
        const shadowOffset = Math.floor(positioning.size.width * 0.015);
        const shadowBlur = Math.floor(positioning.size.width * 0.02);
        
        try {
          const shadow = await sharp(resizedProduct)
            .modulate({ brightness: 0.4 })
            .blur(shadowBlur)
            .png()
            .toBuffer();
          
          // Add shadow first
          compositeOperations.unshift({
            input: shadow,
            left: positioning.position.left + shadowOffset,
            top: positioning.position.top + shadowOffset,
            blend: 'multiply'
          });
        } catch (shadowError) {
          logger.warn('Shadow creation failed, proceeding without shadow', { error: shadowError.message });
        }
      }

      // Step 6: Final composite
      await sharp(background)
        .composite(compositeOperations)
        .jpeg({ quality: 95 })
        .toFile(outputPath);

      logger.info('Intelligent processing completed successfully', {
        outputPath,
        strategy: positioning.strategy,
        productType: productAnalysis.productType,
        backgroundStyle: backgroundAnalysis.style,
        finalSize: `${positioning.size.width}x${positioning.size.height}`,
        finalPosition: `${positioning.position.left},${positioning.position.top}`
      });

      // Return detailed results
      return {
        outputPath,
        analysis: {
          background: backgroundAnalysis,
          product: productAnalysis,
          positioning
        }
      };

    } catch (error) {
      logger.error('Intelligent processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Batch process multiple backgrounds with intelligent analysis
   */
  async createIntelligentBackgroundCombinations(productImagePath, outputDir, fileName) {
    try {
      const backgroundsDir = path.join(__dirname, '../../test-backgrounds');
      const availableBackgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
      const results = [];
      
      // First analyze the product once (for efficiency)
      const productAnalysis = await this.analyzeProduct(productImagePath);
      
      for (const background of availableBackgrounds) {
        const backgroundPath = path.join(backgroundsDir, background);
        
        if (await fs.pathExists(backgroundPath)) {
          const backgroundName = path.basename(background, path.extname(background));
          const outputPath = path.join(outputDir, `intelligent_${backgroundName}_${fileName}`);
          
          const result = await this.processProductWithIntelligentBackground(
            productImagePath, 
            backgroundPath, 
            outputPath
          );
          
          results.push({
            backgroundName,
            outputPath: result.outputPath,
            analysis: result.analysis
          });
        }
      }
      
      logger.info('Intelligent background combinations completed', { 
        productImagePath, 
        resultsCount: results.length 
      });
      
      return results;
    } catch (error) {
      logger.error('Error creating intelligent combinations', { error: error.message });
      throw error;
    }
  }
}

module.exports = IntelligentImageProcessor;