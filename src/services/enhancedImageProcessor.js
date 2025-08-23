const ImageProcessor = require('./imageProcessor');
const IntelligentImageProcessor = require('./intelligentImageProcessor');
const logger = require('../utils/logger');

/**
 * Enhanced Image Processor that combines traditional and AI-powered processing
 * Falls back to traditional methods if AI processing fails
 */
class EnhancedImageProcessor extends ImageProcessor {
  constructor() {
    super();
    this.intelligentProcessor = new IntelligentImageProcessor();
    this.useIntelligentProcessing = process.env.USE_INTELLIGENT_PROCESSING !== 'false'; // Default to true
  }

  /**
   * Enhanced background processing with intelligent analysis
   * Falls back to traditional processing if AI fails
   */
  async addBackground(inputPath, outputPath, options = {}) {
    try {
      // If intelligent processing is disabled, use traditional method
      if (!this.useIntelligentProcessing) {
        logger.info('Using traditional background processing (intelligent disabled)');
        return await super.addBackground(inputPath, outputPath, options);
      }

      // Attempt intelligent processing first
      const backgroundsDir = require('path').join(__dirname, '../../test-backgrounds');
      const selectedBackground = options.backgroundName || 'Back1.jpg';
      const backgroundPath = require('path').join(backgroundsDir, selectedBackground);
      
      if (!await require('fs-extra').pathExists(backgroundPath)) {
        logger.warn('Background file not found, falling back to traditional processing');
        return await super.addBackground(inputPath, outputPath, options);
      }

      try {
        logger.info('Attempting intelligent background processing', { 
          inputPath, 
          outputPath, 
          selectedBackground 
        });

        const result = await this.intelligentProcessor.processProductWithIntelligentBackground(
          inputPath, 
          backgroundPath, 
          outputPath
        );

        logger.info('Intelligent processing successful', {
          strategy: result.analysis.positioning.strategy,
          productType: result.analysis.product.productType,
          backgroundStyle: result.analysis.background.style
        });

        return result.outputPath;

      } catch (aiError) {
        logger.warn('Intelligent processing failed, falling back to traditional method', { 
          error: aiError.message 
        });
        
        // Fallback to traditional processing
        return await super.addBackground(inputPath, outputPath, options);
      }

    } catch (error) {
      logger.error('Enhanced background processing failed completely', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhanced batch processing with intelligent analysis
   */
  async createAllBackgroundCombinations(inputPath, outputDir, fileName, productType = null) {
    try {
      // If intelligent processing is disabled, use traditional method
      if (!this.useIntelligentProcessing) {
        logger.info('Using traditional batch processing (intelligent disabled)');
        return await super.createAllBackgroundCombinations(inputPath, outputDir, fileName, productType);
      }

      try {
        logger.info('Attempting intelligent batch processing', { inputPath });

        const results = await this.intelligentProcessor.createIntelligentBackgroundCombinations(
          inputPath,
          outputDir,
          fileName
        );

        // Convert to traditional format for compatibility
        const formattedResults = results.map(result => ({
          backgroundName: result.backgroundName,
          outputPath: result.outputPath,
          analysis: result.analysis // Additional data from intelligent processing
        }));

        logger.info('Intelligent batch processing successful', { 
          resultsCount: formattedResults.length 
        });

        return formattedResults;

      } catch (aiError) {
        logger.warn('Intelligent batch processing failed, falling back to traditional method', { 
          error: aiError.message 
        });
        
        // Fallback to traditional batch processing
        return await super.createAllBackgroundCombinations(inputPath, outputDir, fileName, productType);
      }

    } catch (error) {
      logger.error('Enhanced batch processing failed completely', { error: error.message });
      throw error;
    }
  }

  /**
   * Get processing statistics and recommendations
   */
  async getProcessingRecommendations(inputPath) {
    try {
      if (!this.useIntelligentProcessing) {
        return {
          method: 'traditional',
          recommendations: ['Standard background processing will be used']
        };
      }

      const productAnalysis = await this.intelligentProcessor.analyzeProduct(inputPath);
      
      const recommendations = [];
      
      if (productAnalysis.productType === 'necklace' && productAnalysis.chainInfo?.hasChain) {
        recommendations.push(`Detected ${productAnalysis.productType} with ${productAnalysis.chainInfo.chainLength} chain`);
        recommendations.push('Will optimize for full chain visibility');
      } else if (productAnalysis.productType === 'ring') {
        recommendations.push('Detected ring - will center and optimize for detail visibility');
      }
      
      if (productAnalysis.visualFocus?.detail === 'high') {
        recommendations.push('High detail product - will ensure adequate sizing for clarity');
      }

      return {
        method: 'intelligent',
        productType: productAnalysis.productType,
        hasChain: productAnalysis.chainInfo?.hasChain,
        chainLength: productAnalysis.chainInfo?.chainLength,
        recommendations
      };

    } catch (error) {
      logger.warn('Could not generate processing recommendations', { error: error.message });
      return {
        method: 'traditional',
        recommendations: ['Standard processing will be used due to analysis error']
      };
    }
  }

  /**
   * Process with detailed analysis logging
   */
  async processWithAnalysis(inputPath, outputPath, options = {}) {
    try {
      const startTime = Date.now();
      
      // Get recommendations first
      const recommendations = await this.getProcessingRecommendations(inputPath);
      logger.info('Processing recommendations', recommendations);

      // Process the image
      const result = await this.addBackground(inputPath, outputPath, options);
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Processing completed with analysis', {
        method: recommendations.method,
        processingTimeMs: processingTime,
        inputPath,
        outputPath: result,
        productType: recommendations.productType,
        hasChain: recommendations.hasChain
      });

      return {
        outputPath: result,
        analysis: recommendations,
        processingTime
      };

    } catch (error) {
      logger.error('Analysis processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Enable or disable intelligent processing at runtime
   */
  setIntelligentProcessing(enabled) {
    this.useIntelligentProcessing = enabled;
    logger.info('Intelligent processing ' + (enabled ? 'enabled' : 'disabled'));
  }

  /**
   * Check if intelligent processing is available
   */
  async checkIntelligentProcessingAvailability() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured - intelligent processing unavailable');
        return false;
      }

      // Quick test to verify OpenAI connectivity
      await this.intelligentProcessor.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1
      });

      logger.info('Intelligent processing available and configured');
      return true;

    } catch (error) {
      logger.warn('Intelligent processing not available', { error: error.message });
      return false;
    }
  }
}

module.exports = EnhancedImageProcessor;