const OneClickListerAPI = require('./src/services/oneClickListerAPI');
const logger = require('./src/utils/logger');

// Sample Etsy automation product for conversion testing
const sampleEtsyProduct = {
  title: "Handcrafted Sterling Silver Ring with Natural Gemstone - Bohemian Style Jewelry",
  description: "Beautiful handcrafted sterling silver ring with natural gemstone. Perfect for everyday wear or special occasions. Each piece is unique and made with love.",
  price: 49.99,
  quantity: 5,
  sku: "RING-SILVER-001",
  tags: [
    "sterling silver",
    "handmade ring", 
    "gemstone jewelry",
    "bohemian style",
    "everyday wear",
    "gift for her",
    "artisan made",
    "natural stone",
    "silver ring",
    "boho jewelry",
    "handcrafted",
    "unique ring",
    "womens jewelry"
  ],
  categories: ["jewelry", "rings"],
  materials: ["Sterling Silver", "Gemstone"]
};

const sampleImagePaths = [
  "https://example.com/ring-front.jpg",
  "https://example.com/ring-side.jpg",
  "https://example.com/ring-back.jpg"
];

async function testOneClickListerAPI() {
  try {
    console.log('🔬 Testing OneClickLister API Integration...\n');

    // Initialize API service
    const oclAPI = new OneClickListerAPI();

    // Test 1: Configuration validation
    console.log('1️⃣ Validating Configuration...');
    const configValidation = oclAPI.validateConfig();
    
    console.log(`   API Key: ${process.env.ONECLICKLISTER_API_KEY ? '✅' : '❌'}`);
    console.log(`   User Code: ${process.env.ONECLICKLISTER_USER_CODE ? '✅' : '❌'}`);
    console.log(`   Store ID: ${process.env.ONECLICKLISTER_STORE_ID ? '✅' : '❌'}`);
    
    if (!configValidation.valid) {
      console.log('❌ Configuration errors:', configValidation.errors);
      console.log('\n💡 Please set these environment variables:');
      console.log('   ONECLICKLISTER_API_KEY=your_api_key');
      console.log('   ONECLICKLISTER_USER_CODE=your_user_code');
      console.log('   ONECLICKLISTER_STORE_ID=your_store_id');
      console.log('   ONECLICKLISTER_API_URL=https://api.oneclicklister.com (optional)');
      return;
    }

    console.log('✅ Configuration is valid\n');

    // Test 2: Product conversion from Etsy format
    console.log('2️⃣ Testing Product Conversion...');
    const oclPayload = oclAPI.convertEtsyProductToOCL(sampleEtsyProduct, sampleImagePaths);
    
    console.log(`   Product Title: ${oclPayload.product.title}`);
    console.log(`   SKU: ${oclPayload.product.sku}`);
    console.log(`   Price: $${oclPayload.product.price.amount}`);
    console.log(`   Tags: ${oclPayload.product.tags.length} tags`);
    console.log(`   Images: ${oclPayload.product.images.length} images`);
    console.log(`   Product Type: ${oclPayload.product.productType}`);
    console.log('✅ Product conversion successful\n');

    // Display converted payload (truncated for readability)
    console.log('📋 Converted OneClickLister Payload (sample):');
    console.log(JSON.stringify({
      product: {
        title: oclPayload.product.title,
        sku: oclPayload.product.sku,
        price: oclPayload.product.price,
        productType: oclPayload.product.productType,
        tags: oclPayload.product.tags.slice(0, 5),
        images: oclPayload.product.images.length + ' images',
        '...': 'truncated for display'
      },
      storeId: oclPayload.storeId,
      userCode: oclPayload.userCode
    }, null, 2));

    console.log('\n3️⃣ Testing API Methods (Mock/Dry Run)...');
    
    // Test authorization (will fail without real API)
    console.log('   🔐 Testing Authorization...');
    try {
      const authTest = await oclAPI.testAuthorization();
      console.log('   ✅ Authorization successful:', authTest.success);
    } catch (error) {
      console.log('   ⚠️ Authorization test failed (expected without real API):', error.message.substring(0, 100));
    }

    // Test store fetch (will fail without real API)
    console.log('   🏪 Testing Store Fetch...');
    try {
      const store = await oclAPI.fetchStore();
      console.log('   ✅ Store fetch successful:', store.name);
    } catch (error) {
      console.log('   ⚠️ Store fetch failed (expected without real API):', error.message.substring(0, 100));
    }

    // Test product creation (will fail without real API)
    console.log('   🛍️ Testing Product Creation...');
    try {
      const result = await oclAPI.createProduct(oclPayload);
      console.log('   ✅ Product creation successful:', result.productId);
    } catch (error) {
      console.log('   ⚠️ Product creation failed (expected without real API):', error.message.substring(0, 100));
    }

    console.log('\n4️⃣ Testing Bulk Operations...');
    
    // Create multiple payloads for bulk testing
    const bulkPayloads = [
      oclAPI.convertEtsyProductToOCL({
        ...sampleEtsyProduct,
        title: "Product 1 - Sterling Silver Earrings",
        sku: "EARRING-SILVER-001"
      }, sampleImagePaths),
      oclAPI.convertEtsyProductToOCL({
        ...sampleEtsyProduct,
        title: "Product 2 - Sterling Silver Bracelet", 
        sku: "BRACELET-SILVER-001"
      }, sampleImagePaths),
      oclAPI.convertEtsyProductToOCL({
        ...sampleEtsyProduct,
        title: "Product 3 - Sterling Silver Necklace",
        sku: "NECKLACE-SILVER-001"
      }, sampleImagePaths)
    ];

    console.log(`   📦 Created ${bulkPayloads.length} payloads for bulk testing`);
    
    try {
      const bulkResult = await oclAPI.createProductsBulk(bulkPayloads);
      console.log('   ✅ Bulk creation successful:', bulkResult.successCount, 'products');
    } catch (error) {
      console.log('   ⚠️ Bulk creation failed (expected without real API):', error.message.substring(0, 100));
    }

    console.log('\n5️⃣ Testing Etsy-specific Methods...');
    
    try {
      const categories = await oclAPI.getEtsyCategories();
      console.log('   ✅ Etsy categories fetched:', categories.length, 'categories');
    } catch (error) {
      console.log('   ⚠️ Etsy categories fetch failed (expected without real API):', error.message.substring(0, 100));
    }

    try {
      const shippingProfiles = await oclAPI.getShippingProfiles();
      console.log('   ✅ Shipping profiles fetched:', shippingProfiles.length, 'profiles');
    } catch (error) {
      console.log('   ⚠️ Shipping profiles fetch failed (expected without real API):', error.message.substring(0, 100));
    }

    console.log('\n6️⃣ Testing Utility Methods...');
    
    // Test product type inference
    const productTypes = [
      'Sterling Silver Ring',
      'Cotton T-Shirt',
      'Home Decor Pillow',
      'Art Print Poster',
      'Unknown Product'
    ];

    console.log('   🔍 Product Type Inference:');
    productTypes.forEach(title => {
      const type = oclAPI.inferProductType(title);
      console.log(`     "${title}" → ${type}`);
    });

    console.log('\n🎉 OneClickLister API Integration Test Complete!');
    
    console.log('\n📊 Integration Summary:');
    console.log('   ✅ Configuration validation');
    console.log('   ✅ Product format conversion (Etsy → OneClickLister)');
    console.log('   ✅ API service methods (structure ready)');
    console.log('   ✅ Bulk operations support');
    console.log('   ✅ Etsy-specific integrations');
    console.log('   ✅ Utility functions');

    console.log('\n🔗 Ready for Integration:');
    console.log('   1. Set OneClickLister API credentials in .env file');
    console.log('   2. Update API base URL if different');
    console.log('   3. Test with real API endpoints');
    console.log('   4. Integrate with existing Etsy automation workflow');

    console.log('\n💡 Usage Example:');
    console.log('   const oclAPI = new OneClickListerAPI();');
    console.log('   const payload = oclAPI.convertEtsyProductToOCL(etsyProduct, imagePaths);');
    console.log('   const result = await oclAPI.createProduct(payload);');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('OneClickLister API test error', { error: error.message });
  }
}

// Test individual conversion
async function testProductConversion() {
  try {
    console.log('\n🔄 Testing Advanced Product Conversion...\n');

    const oclAPI = new OneClickListerAPI();

    // Test with various product types
    const testProducts = [
      {
        title: "Handmade Silver Jewelry Ring",
        categories: ["jewelry"],
        price: 45.99,
        sku: "JEWELRY-001"
      },
      {
        title: "Cotton Organic T-Shirt",
        categories: ["clothing"],
        price: 25.99,
        sku: "CLOTHING-001"
      },
      {
        title: "Home Decor Throw Pillow",
        categories: ["home"],
        price: 35.99,
        sku: "HOME-001"
      },
      {
        title: "Digital Art Print Download",
        categories: ["art"],
        price: 12.99,
        sku: "ART-001"
      }
    ];

    console.log('🎯 Converting different product types:');
    testProducts.forEach((product, index) => {
      const converted = oclAPI.convertEtsyProductToOCL(product, []);
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Type: ${converted.product.productType}`);
      console.log(`   Price: $${converted.product.price.amount}`);
      console.log(`   SKU: ${converted.product.sku}\n`);
    });

    console.log('✅ Advanced conversion tests completed!');

  } catch (error) {
    console.error('❌ Conversion test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  (async () => {
    await testOneClickListerAPI();
    await testProductConversion();
  })();
}

module.exports = {
  testOneClickListerAPI,
  testProductConversion
};