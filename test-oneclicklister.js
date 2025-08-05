const EtsyOneClickListerService = require('./src/services/etsyOneClickLister');
const logger = require('./src/utils/logger');

// Sample OneClickLister payload for testing
const samplePayload = {
  "product": {
    "attributes": [
      {
        "displayName": "Material",
        "name": "material",
        "value": ["Sterling Silver", "Gemstone"]
      },
      {
        "displayName": "Category",
        "name": "category", 
        "value": "jewelry"
      },
      {
        "displayName": "Style",
        "name": "style",
        "value": "Bohemian"
      }
    ],
    "deleted_images": [],
    "description": "Beautiful handcrafted sterling silver ring with natural gemstone. Perfect for everyday wear or special occasions. Each piece is unique and made with love.",
    "dimensions": {
      "height": "5",
      "length": "20",
      "unit": "mm",
      "width": "15"
    },
    "images": [
      {
        "altText": "Sterling silver ring with gemstone - front view",
        "height": 3000,
        "listingImageId": null,
        "newImage": true,
        "position": 1,
        "skuId": 12345,
        "url": "https://example.com/ring-front.jpg",
        "width": 3000
      },
      {
        "altText": "Sterling silver ring with gemstone - side view",
        "height": 3000,
        "listingImageId": null,
        "newImage": true,
        "position": 2,
        "skuId": 12345,
        "url": "https://example.com/ring-side.jpg",
        "width": 3000
      }
    ],
    "listingId": null,
    "mainSkuId": 12345,
    "price": {
      "amount": "49.99",
      "currency": "USD"
    },
    "productType": "jewelry",
    "properties": [],
    "quantity": 5,
    "sku": "RING-SILVER-001",
    "status": "active",
    "tags": [
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
    "title": "Handcrafted Sterling Silver Ring with Natural Gemstone - Bohemian Style Jewelry",
    "variants": [
      {
        "attributes": [],
        "errors": {
          "priceError": "",
          "quantityError": ""
        },
        "images": [],
        "listingId": null,
        "newSku": "RING-SILVER-001-S",
        "price": {
          "amount": 49.99,
          "currency": "USD"
        },
        "properties": [
          {
            "errors": {
              "priceError": "",
              "quantityError": ""
            },
            "images": [],
            "price": {
              "amount": 49.99,
              "currency": "USD"
            },
            "property_id": 200,
            "property_name": "Size",
            "property_value": "Small (6)",
            "quantity": 2,
            "sku": "RING-SILVER-001-S",
            "value_id": 1001,
            "visibility": true
          }
        ],
        "quantity": 2,
        "sku": "RING-SILVER-001-S",
        "title": "Small Size",
        "variantId": null,
        "visibility": true,
        "weight": {
          "amount": "3.5",
          "unit": "g"
        }
      },
      {
        "attributes": [],
        "errors": {
          "priceError": "",
          "quantityError": ""
        },
        "images": [],
        "listingId": null,
        "newSku": "RING-SILVER-001-M",
        "price": {
          "amount": 52.99,
          "currency": "USD"
        },
        "properties": [
          {
            "errors": {
              "priceError": "",
              "quantityError": ""
            },
            "images": [],
            "price": {
              "amount": 52.99,
              "currency": "USD"
            },
            "property_id": 200,
            "property_name": "Size",
            "property_value": "Medium (7)",
            "quantity": 2,
            "sku": "RING-SILVER-001-M",
            "value_id": 1002,
            "visibility": true
          }
        ],
        "quantity": 2,
        "sku": "RING-SILVER-001-M",
        "title": "Medium Size",
        "variantId": null,
        "visibility": true,
        "weight": {
          "amount": "4.0",
          "unit": "g"
        }
      },
      {
        "attributes": [],
        "errors": {
          "priceError": "",
          "quantityError": ""
        },
        "images": [],
        "listingId": null,
        "newSku": "RING-SILVER-001-L",
        "price": {
          "amount": 55.99,
          "currency": "USD"
        },
        "properties": [
          {
            "errors": {
              "priceError": "",
              "quantityError": ""
            },
            "images": [],
            "price": {
              "amount": 55.99,
              "currency": "USD"
            },
            "property_id": 200,
            "property_name": "Size",
            "property_value": "Large (8)",
            "quantity": 1,
            "sku": "RING-SILVER-001-L",
            "value_id": 1003,
            "visibility": true
          }
        ],
        "quantity": 1,
        "sku": "RING-SILVER-001-L",
        "title": "Large Size",
        "variantId": null,
        "visibility": true,
        "weight": {
          "amount": "4.5",
          "unit": "g"
        }
      }
    ],
    "videos": [],
    "weight": {
      "amount": "4.0",
      "unit": "g"
    }
  },
  "storeId": 123,
  "userCode": "USER123"
};

async function testOneClickListerIntegration() {
  try {
    console.log('🚀 Testing OneClickLister Integration...\n');

    const etsyService = new EtsyOneClickListerService();

    // Test payload validation
    console.log('📋 Validating payload...');
    const validation = etsyService.validatePayload(samplePayload);
    
    console.log('Validation Result:', {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    });

    if (!validation.valid) {
      console.log('❌ Payload validation failed!');
      return;
    }

    console.log('✅ Payload validation passed!\n');

    // Test payload transformation
    console.log('🔄 Testing payload transformation...');
    const transformedPayload = etsyService.transformPayload(samplePayload);
    
    console.log('Transformed Payload:');
    console.log(JSON.stringify(transformedPayload, null, 2));
    console.log('\n');

    // Test taxonomy mapping
    console.log('🏷️  Testing taxonomy mapping...');
    const taxonomyId = etsyService.determineTaxonomyId(
      samplePayload.product.productType, 
      samplePayload.product.attributes
    );
    console.log(`Mapped taxonomy ID: ${taxonomyId}`);

    // Test material extraction
    console.log('🧪 Testing material extraction...');
    const materials = etsyService.extractMaterials(samplePayload.product.attributes);
    console.log(`Extracted materials: ${materials.join(', ')}`);

    // Test unit mapping
    console.log('📏 Testing unit mappings...');
    const dimensionUnit = etsyService.mapDimensionUnit(samplePayload.product.dimensions.unit);
    const weightUnit = etsyService.mapWeightUnit(samplePayload.product.weight.unit);
    console.log(`Dimension unit (${samplePayload.product.dimensions.unit}): ${dimensionUnit}`);
    console.log(`Weight unit (${samplePayload.product.weight.unit}): ${weightUnit}`);

    console.log('\n✅ All transformation tests passed!');

    // Uncomment below to test actual API call (requires valid Etsy credentials)
    /*
    console.log('🔗 Testing actual Etsy API call...');
    const result = await etsyService.createListingFromPayload(samplePayload);
    console.log('Listing created:', result);
    */

    console.log('\n🎉 OneClickLister integration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('OneClickLister test error', { error: error.message });
  }
}

// Enhanced test for edge cases
async function testEdgeCases() {
  try {
    console.log('\n🧪 Testing edge cases...\n');

    const etsyService = new EtsyOneClickListerService();

    // Test with minimal payload
    const minimalPayload = {
      "product": {
        "title": "Test Product",
        "description": "Test Description",
        "price": {
          "amount": "19.99",
          "currency": "USD"
        },
        "sku": "TEST-001",
        "quantity": 1,
        "productType": "unknown",
        "tags": ["test"],
        "attributes": [],
        "images": [],
        "variants": []
      },
      "storeId": 123,
      "userCode": "USER123"
    };

    console.log('Testing minimal payload...');
    const minimalValidation = etsyService.validatePayload(minimalPayload);
    console.log('Minimal validation:', minimalValidation);

    // Test with invalid payload
    const invalidPayload = {
      "product": {
        "title": "",
        "description": "",
        "tags": Array(15).fill("too many tags") // More than 13 tags
      }
    };

    console.log('\nTesting invalid payload...');
    const invalidValidation = etsyService.validatePayload(invalidPayload);
    console.log('Invalid validation:', invalidValidation);

    // Test unit mappings with unknown units
    console.log('\nTesting unknown unit mappings...');
    console.log('Unknown dimension unit:', etsyService.mapDimensionUnit('xyz'));
    console.log('Unknown weight unit:', etsyService.mapWeightUnit('xyz'));

    console.log('\n✅ Edge case tests completed!');

  } catch (error) {
    console.error('❌ Edge case test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  (async () => {
    await testOneClickListerIntegration();
    await testEdgeCases();
  })();
}

module.exports = {
  testOneClickListerIntegration,
  testEdgeCases,
  samplePayload
};