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
      const prompt = `ULTIMATE LISTING MODE ACTIVATED! You are my Killer SEO GPT for Etsy.

Product Information:
- Type: ${productInfo.type}
- Name: ${productInfo.name} 
- Images: ${imagePaths.length} photos

Analyze these product images and create FULL SEO optimization using your proven Killer Listing methodology:

1. TITLE: Create a compelling 130-140 character title with maximum keyword density
2. TAGS: Provide exactly 13 tags, each max 20 characters. PRESERVE SPACES if multi-word tags work better for SEO!
3. DESCRIPTION: Write your signature conversion-focused description
4. PRICE RANGE: Suggest competitive pricing
5. CATEGORIES: Select best Etsy categories

CRITICAL: Format tags exactly as needed for best Etsy SEO - keep spaces in tags like "silver jewelry" if better than "silverjewelry".

Provide your complete SEO package in this exact format:

TITLE: [your 130-140 char title]

TAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [tag6], [tag7], [tag8], [tag9], [tag10], [tag11], [tag12], [tag13]

DESCRIPTION: 
[your full description]

PRICE RANGE: [price]

CATEGORIES: [category1], [category2]`;

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

      // Use Custom GPT if available, otherwise fallback to GPT-4o
      let response;
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
            max_tokens: 1200,
            temperature: 0.7
          });
          logger.info('Used Custom GPT for SEO generation', { customGptId });
        } catch (customGptError) {
          logger.warn('Custom GPT failed, falling back to GPT-4o', { error: customGptError.message });
          response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "user", 
                content: messageContent
              }
            ],
            max_tokens: 1200,
            temperature: 0.7
          });
        }
      } else {
        response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "user", 
              content: messageContent
            }
          ],
          max_tokens: 1200,
          temperature: 0.7
        });
      }

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
      
      // Generate variations based on product type
      const variations = await this.generateProductVariations(seoContent, productInfo, imagePaths);
      seoContent.variations = variations;
      
      return seoContent;
    } catch (error) {
      logger.error('Error generating Etsy SEO', { error: error.message });
      throw error;
    }
  }

  async generateProductVariations(seoContent, productInfo, imagePaths) {
    try {
      const productType = productInfo.type.toLowerCase();
      
      // Define variations based on product type
      let variationPrompt = '';
      
      if (productType.includes('necklace') || productType.includes('kolye')) {
        variationPrompt = `Generate Etsy variations for a ${seoContent.title} necklace. Create realistic length and material options with competitive pricing:

NECKLACE VARIATIONS:
- Chain lengths: 16", 18", 20", 22" (most popular lengths)
- Materials: Sterling Silver, Gold Plated, Rose Gold Plated
- Price should increase with length and material quality
- Base price around $19.99-24.99 for 16" Sterling Silver
- Add $2-3 for each 2" length increase
- Add $5-8 for gold plating

Format as JSON array with this structure:
[
  {
    "name": "Chain Length",
    "options": [
      {"name": "16 inches", "price": 19.99, "quantity": 5},
      {"name": "18 inches", "price": 22.99, "quantity": 5},
      {"name": "20 inches", "price": 25.99, "quantity": 5},
      {"name": "22 inches", "price": 28.99, "quantity": 5}
    ]
  },
  {
    "name": "Material",
    "options": [
      {"name": "Sterling Silver", "price": 0, "quantity": 10},
      {"name": "Gold Plated", "price": 6.99, "quantity": 10},
      {"name": "Rose Gold Plated", "price": 6.99, "quantity": 10}
    ]
  }
]

Provide only the JSON array, no other text.`;
      
      } else if (productType.includes('ring') || productType.includes('yüzük')) {
        variationPrompt = `Generate Etsy variations for a ${seoContent.title} ring. Create realistic size and material options with competitive pricing:

RING VARIATIONS:
- Ring sizes: US 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 (full US size range)
- Materials: Sterling Silver, Gold Plated, Rose Gold Plated
- IMPORTANT: All ring sizes have the SAME price - no price difference by size
- Base price around $24.99-29.99 for all sizes
- Only material affects price: Add $7-10 for gold plating
- Custom size option available at same price

Format as JSON array with this structure:
[
  {
    "name": "Ring Size (US)",
    "options": [
      {"name": "US 5", "price": 0, "quantity": 2},
      {"name": "US 6", "price": 0, "quantity": 3},
      {"name": "US 7", "price": 0, "quantity": 5},
      {"name": "US 8", "price": 0, "quantity": 4},
      {"name": "US 9", "price": 0, "quantity": 3},
      {"name": "US 10", "price": 0, "quantity": 3},
      {"name": "US 11", "price": 0, "quantity": 2},
      {"name": "US 12", "price": 0, "quantity": 2},
      {"name": "US 13", "price": 0, "quantity": 1},
      {"name": "US 14", "price": 0, "quantity": 1},
      {"name": "US 15", "price": 0, "quantity": 1},
      {"name": "Custom Size", "price": 0, "quantity": 5}
    ]
  },
  {
    "name": "Material",
    "options": [
      {"name": "Sterling Silver", "price": 24.99, "quantity": 20},
      {"name": "Gold Plated", "price": 32.99, "quantity": 20},
      {"name": "Rose Gold Plated", "price": 32.99, "quantity": 20}
    ]
  }
]

Provide only the JSON array, no other text.`;
      
      } else {
        // Default variations for other product types
        variationPrompt = `Generate basic Etsy variations for ${seoContent.title}. Create 1-2 simple variations with competitive pricing:

Format as JSON array with this structure:
[
  {
    "name": "Color",
    "options": [
      {"name": "Silver", "price": 0, "quantity": 10},
      {"name": "Gold", "price": 5.99, "quantity": 10}
    ]
  }
]

Provide only the JSON array, no other text.`;
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a pricing expert for Etsy handmade jewelry. Generate realistic, competitive variations that customers actually want to buy."
          },
          {
            role: "user",
            content: variationPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const variationsJson = response.choices[0].message.content.trim();
      const variations = JSON.parse(variationsJson);
      
      logger.info('Generated product variations', { 
        productType,
        sku: productInfo.sku,
        variationCount: variations.length
      });
      
      return variations;
      
    } catch (error) {
      logger.error('Error generating product variations', { error: error.message });
      // Return default variations if generation fails
      return [];
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
    
    // Extract tags from format: [tag1], [tag2], [tag3] or tag1, tag2, tag3
    let tags = tagSection.split(',').map(tag => 
      tag.trim()
         .replace(/^\[|\]$/g, '')     // Remove square brackets
         .replace(/^["\']|["\']$/g, '') // Remove quotes
         .replace(/^-\s*/, '')        // Remove leading dashes
         .trim()                      // Clean whitespace
    );
    
    // PRESERVE SPACES in tags - don't remove them!
    // Only filter by length and limit to 13
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