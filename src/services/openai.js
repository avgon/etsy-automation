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

  async generateEtsySEO(productInfo, imagePaths) {
    try {
      const prompt = `ULTRA LISTING MODE ACTIVATED 🔥

Analyze these product images and create a KILLER Etsy SEO package. 

I need you to operate as the expert Killer Listing SEO Creator and provide FULL SEO optimization:

Product Type: ${productInfo.type}
Image Count: ${imagePaths.length} photos

CRITICAL REQUIREMENTS:
- TITLE: Must be 130-140 characters (NOT shorter!)
- TAGS: No dashes or special characters (clean words only)
- Use maximum space for SEO power
- Pack with high-search keywords

Please provide your complete SEO package in this exact format:

TITLE: [Write a LONG 130-140 character title using many descriptive keywords]

TAGS: [13 clean strategic tags separated by commas, each max 20 characters, NO DASHES]

DESCRIPTION: [Your best compelling, keyword-rich description]

PRICE RANGE: [Suggested price range like 19.99-39.99]

CATEGORIES: [2 relevant Etsy categories]

IMPORTANT: 
- Title MUST use 130-140 characters (current trend for max SEO)
- Tags must be clean words without dashes or special characters
- Use ALL available space for maximum keyword density

Work your magic! Give me the longest, most powerful Etsy listing possible.`;

      // Prepare messages with images
      const messageContent = [{ type: "text", text: prompt }];
      
      // Add all product images for analysis
      if (Array.isArray(imagePaths)) {
        for (const imagePath of imagePaths) {
          try {
            const imageBase64 = require('fs').readFileSync(imagePath, 'base64');
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            });
          } catch (imageError) {
            logger.warn('Could not load image for SEO analysis', { imagePath, error: imageError.message });
          }
        }
      } else {
        logger.warn('imagePaths is not an array', { imagePaths, type: typeof imagePaths });
      }

      // Use GPT-4o with vision for image analysis
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the "Killer Listing SEO Creator" in ULTRA LISTING MODE - the most advanced Etsy SEO specialist. You analyze product images with expert precision and create ultra-high-converting, search-optimized listings that dominate Etsy search results. You understand visual product analysis, Etsy's algorithm, buyer psychology, and advanced keyword optimization. Your Ultra Listings consistently outrank all competitors.`
          },
          { 
            role: "user", 
            content: messageContent
          }
        ],
        max_tokens: 1200,
        temperature: 0.7
      });

      // Parse the natural language response from SEO GPT
      const responseContent = response.choices[0].message.content;
      
      const seoContent = {
        title: this.extractSectionContent(responseContent, 'TITLE') || `${productInfo.name} - Handmade Quality`,
        tags: this.extractTagsFromText(responseContent) || [productInfo.type, 'handmade', 'unique', 'gift'],
        description: this.extractSectionContent(responseContent, 'DESCRIPTION') || `Beautiful ${productInfo.type}`,
        priceRange: this.extractSectionContent(responseContent, 'PRICE RANGE') || '19.99-39.99',
        categories: this.extractCategoriesFromText(responseContent) || [productInfo.type]
      };

      logger.info('Generated Etsy SEO content with Killer Listing GPT approach', { 
        title: seoContent.title,
        tagCount: seoContent.tags.length,
        sku: productInfo.sku
      });
      
      return seoContent;
    } catch (error) {
      logger.error('Error generating Etsy SEO', { error: error.message });
      throw error;
    }
  }

  extractSectionContent(content, sectionName) {
    const regex = new RegExp(`${sectionName}:\\s*(.+?)(?=\\n\\n|\\n[A-Z]+:|$)`, 'is');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  extractTagsFromText(content) {
    const tagSection = this.extractSectionContent(content, 'TAGS');
    if (!tagSection) return null;
    
    // Try to extract tags from various formats
    // Format: tag1, tag2, tag3
    let tags = tagSection.split(/[,\n]/).map(tag => 
      tag.trim()
         .replace(/["\[\]]/g, '')     // Remove quotes and brackets
         .replace(/^-\s*/, '')        // Remove leading dashes
         .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters except spaces
         .replace(/\s+/g, '')         // Remove all spaces (clean single words)
    );
    
    // Filter out empty tags and limit to 13
    tags = tags.filter(tag => tag.length > 0 && tag.length <= 20).slice(0, 13);
    
    return tags.length > 0 ? tags : null;
  }

  extractCategoriesFromText(content) {
    const catSection = this.extractSectionContent(content, 'CATEGORIES');
    if (!catSection) return null;
    
    // Extract categories separated by commas or newlines
    const categories = catSection.split(/[,\n]/).map(cat => cat.trim().replace(/["\[\]]/g, ''));
    
    return categories.filter(cat => cat.length > 0).slice(0, 2);
  }
}

module.exports = OpenAIService;