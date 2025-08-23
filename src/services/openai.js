const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  async generateShowcasePrompt(imagePath, productType) {
    try {
      const prompt = `Analyze this ${productType} image and create a DALL-E prompt to generate a professional lifestyle showcase scene. IMPORTANT: Create a scene that shows this product being worn/used by a model in a real-world setting. The scene should:
      
      - Show a professional model wearing/using this ${productType}
      - Create a lifestyle/fashion photography atmosphere
      - Use professional lighting and composition
      - Show the product in an attractive, marketable way
      - Make the product the main focus while showing it in use
      - Use appropriate setting for this type of product
      - Create a scene that would make buyers want to purchase
      - Professional e-commerce quality
      
      For jewelry: Show on an elegant model in a fashion shoot setting
      For accessories: Show being worn in a stylish lifestyle context
      For home items: Show in a beautiful home setting being used
      
      Create a complete lifestyle scene prompt. Provide only the DALL-E prompt, no other text.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${require('fs').readFileSync(imagePath, 'base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 300
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating showcase prompt', { error: error.message });
      throw error;
    }
  }

  async generateShowcaseImage(prompt) {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd"
      });

      return response.data[0].url;
    } catch (error) {
      logger.error('Error generating showcase image', { error: error.message });
      throw error;
    }
  }

  async processImageWithShowcase(imagePath, productType) {
    try {
      logger.info('Starting lifestyle showcase processing', { imagePath, productType });
      
      // Step 1: Analyze image and generate showcase prompt
      const showcasePrompt = await this.generateShowcasePrompt(imagePath, productType);
      logger.info('Generated showcase prompt', { prompt: showcasePrompt });
      
      // Step 2: Generate showcase image
      const showcaseUrl = await this.generateShowcaseImage(showcasePrompt);
      logger.info('Generated showcase image', { url: showcaseUrl });
      
      return {
        showcasePrompt,
        showcaseUrl
      };
    } catch (error) {
      logger.error('Error processing image with showcase', { error: error.message });
      throw error;
    }
  }

  async generateEtsySEO(productInfo, imagePaths, customGptId) {
    try {
      const prompt = `You are an expert Etsy SEO specialist. Analyze the provided product images and create a complete Etsy listing optimization package.

Product Information:
- Type: ${productInfo.type}
- Name: ${productInfo.name}
- Images: ${imagePaths.length} photos

CRITICAL REQUIREMENTS:
1. Title MUST be exactly 130-140 characters (not shorter!)
2. Must include high-volume keywords
3. Must be sales-focused and compelling
4. Response MUST be valid JSON only

Create an optimized Etsy listing:
- Title: EXACTLY 130-140 characters (pack with keywords)
- Tags: 13 single words (no spaces, no dashes)
- Description: Compelling sales copy with keywords
- Price: Competitive USD price
- Categories: 2 relevant Etsy categories

TITLE REQUIREMENT: The title must be between 130-140 characters. Use every character for maximum SEO impact.

Response format (EXACTLY as shown):
{
  "title": "Your SEO optimized title with maximum keywords that must be exactly between 130-140 characters to maximize Etsy search visibility",
  "tags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10", "keyword11", "keyword12", "keyword13"],
  "description": "Compelling product description that drives sales and includes keywords naturally",
  "price": "29.99",
  "categories": ["Jewelry", "Necklaces"]
}

RESPOND ONLY WITH THE JSON OBJECT. TITLE MUST BE 130-140 CHARACTERS.`;

      // Prepare messages with images
      const messageContent = [{ type: "text", text: prompt }];
      
      // Add all product images for analysis
      if (Array.isArray(imagePaths)) {
        for (const imagePath of imagePaths) {
          try {
            const imageBase64 = require('fs').readFileSync(imagePath, 'base64');
            const extension = require('path').extname(imagePath).toLowerCase();
            const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
            
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            });
          } catch (imageError) {
            logger.warn('Could not load image for SEO analysis', { imagePath, error: imageError.message });
          }
        }
      } else {
        logger.warn('imagePaths is not an array', { imagePaths, type: typeof imagePaths });
      }

      // Intelligent model selection: Custom GPT with GPT-4o fallback
      let response;
      let modelUsed = 'unknown';
      
      // Try Custom GPT first if available
      if (customGptId && customGptId.startsWith('g-')) {
        try {
          response = await this.openai.chat.completions.create({
            model: customGptId,
            messages: [
              { 
                role: "user", 
                content: messageContent
              }
            ],
            max_tokens: 1500,
            temperature: 0.7
          });
          modelUsed = 'Custom GPT';
          logger.info('Successfully used Custom GPT for SEO generation', { customGptId });
        } catch (customGptError) {
          logger.warn('Custom GPT unavailable, using GPT-4o', { 
            error: customGptError.message,
            customGptId 
          });
          
          // Fallback to GPT-4o (proven to work well)
          response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "user", 
                content: messageContent
              }
            ],
            max_tokens: 1500,
            temperature: 0.7
          });
          modelUsed = 'GPT-4o (fallback)';
          logger.info('Using GPT-4o fallback - works perfectly for SEO generation');
        }
      } else {
        // Direct GPT-4o if no Custom GPT ID
        response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "user", 
              content: messageContent
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        modelUsed = 'GPT-4o (default)';
        logger.info('Using GPT-4o for SEO generation');
      }

      // Custom GPT'den gelen JSON yanıtını direkt parse et
      const responseContent = response.choices[0].message.content.trim();
      
      // JSON yanıtını parse et
      let seoContent;
      try {
        // JSON'ın başında/sonunda gereksiz karakterler varsa temizle
        const cleanJson = responseContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        seoContent = JSON.parse(cleanJson);
        
        // JSON validasyonu
        if (!seoContent.title || !seoContent.tags || !seoContent.description || !seoContent.price) {
          throw new Error('Custom GPT response missing required fields');
        }
        
        // Title uzunluk kontrolü
        const titleLength = seoContent.title.length;
        if (titleLength < 130 || titleLength > 140) {
          logger.warn('Title length not in optimal range', { 
            titleLength, 
            title: seoContent.title,
            requiredRange: '130-140 characters'
          });
          
          // Title'ı otomatik düzelt
          if (titleLength < 130) {
            // Kısa ise uzat
            const padding = ' - Perfect Gift for Her Handmade Jewelry Unique Style';
            seoContent.title = seoContent.title + padding.substring(0, 140 - titleLength);
            logger.info('Title automatically extended', { 
              newLength: seoContent.title.length,
              newTitle: seoContent.title 
            });
          } else if (titleLength > 140) {
            // Uzun ise kısalt
            seoContent.title = seoContent.title.substring(0, 140);
            logger.info('Title automatically trimmed', { 
              newLength: seoContent.title.length,
              newTitle: seoContent.title 
            });
          }
        }
        
      } catch (parseError) {
        logger.error('Failed to parse Custom GPT JSON response', { 
          error: parseError.message, 
          response: responseContent.substring(0, 500) 
        });
        throw new Error(`Custom GPT must return valid JSON format. Got: ${responseContent.substring(0, 200)}...`);
      }

      logger.info('Successfully generated SEO content', { 
        title: seoContent.title,
        titleLength: seoContent.title.length,
        tagCount: seoContent.tags ? seoContent.tags.length : 0,
        sku: productInfo.sku,
        price: seoContent.price,
        modelUsed: modelUsed
      });
      
      return seoContent;
    } catch (error) {
      logger.error('Error generating Etsy SEO', { error: error.message });
      throw error;
    }
  }

}

module.exports = OpenAIService;