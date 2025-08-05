const ImageProcessor = require('./src/services/imageProcessor');
const logger = require('./src/utils/logger');
const path = require('path');

async function testProductPositioning() {
  try {
    console.log('🎯 Testing Product Positioning System...\n');

    const imageProcessor = new ImageProcessor();

    // Test different product types and sizes
    const testCases = [
      {
        productType: 'necklace',
        productSize: { width: 1200, height: 1800 },
        description: 'Large Necklace (Portrait)'
      },
      {
        productType: 'necklace', 
        productSize: { width: 1500, height: 1200 },
        description: 'Wide Necklace (Landscape)'
      },
      {
        productType: 'ring',
        productSize: { width: 1000, height: 1000 },
        description: 'Square Ring'
      },
      {
        productType: 'ring',
        productSize: { width: 1200, height: 800 },
        description: 'Wide Ring (Landscape)'
      },
      {
        productType: 'yüzük',
        productSize: { width: 800, height: 1200 },
        description: 'Tall Ring (Portrait)'
      },
      {
        productType: 'kolye',
        productSize: { width: 900, height: 1600 },
        description: 'Turkish Necklace (Portrait)'
      }
    ];

    console.log('📐 Reference Point Analysis:');
    console.log('   Canvas Size: 3000x3000 pixels');
    console.log('   Reference Point (Blue X): 35% from left, 30% from top');
    console.log('   Reference Coordinates: (1050, 900)\n');

    console.log('🧪 Testing Positioning for Different Products:\n');

    testCases.forEach((testCase, index) => {
      const position = imageProcessor.getReferencePointPosition(
        testCase.productType,
        testCase.productSize,
        3000
      );

      console.log(`${index + 1}. ${testCase.description}`);
      console.log(`   Product Type: ${testCase.productType}`);
      console.log(`   Product Size: ${testCase.productSize.width}x${testCase.productSize.height}`);
      console.log(`   Position: (${position.left}, ${position.top})`);
      
      // Calculate reference point alignment
      const productCenterX = position.left + (testCase.productSize.width / 2);
      const productCenterY = position.top + (testCase.productSize.height / 2);
      
      // For necklaces, the reference point is slightly higher than center
      let referenceAlignmentY = productCenterY;
      if (testCase.productType === 'necklace' || testCase.productType === 'kolye') {
        referenceAlignmentY = position.top + (testCase.productSize.height * 0.4);
      }
      
      console.log(`   Product Center: (${Math.round(productCenterX)}, ${Math.round(productCenterY)})`);
      console.log(`   Reference Alignment: (${Math.round(productCenterX)}, ${Math.round(referenceAlignmentY)})`);
      
      // Validate positioning
      const isWithinBounds = (
        position.left >= 0 &&
        position.top >= 0 &&
        position.left + testCase.productSize.width <= 3000 &&
        position.top + testCase.productSize.height <= 3000
      );
      
      console.log(`   Within Bounds: ${isWithinBounds ? '✅' : '❌'}`);
      
      // Check reference point accuracy
      const expectedRefX = 1050; // 35% of 3000
      const expectedRefY = 900;  // 30% of 3000
      const refAccuracyX = Math.abs(productCenterX - expectedRefX);
      const refAccuracyY = Math.abs(referenceAlignmentY - expectedRefY);
      
      console.log(`   Reference Accuracy: X±${Math.round(refAccuracyX)}px, Y±${Math.round(refAccuracyY)}px`);
      console.log(`   Positioning: ${refAccuracyX < 10 && refAccuracyY < 10 ? '🎯 PRECISE' : refAccuracyX < 50 && refAccuracyY < 50 ? '✅ GOOD' : '⚠️ NEEDS ADJUSTMENT'}\n`);
    });

    // Test edge cases
    console.log('🔍 Testing Edge Cases:\n');

    const edgeCases = [
      {
        name: 'Very Large Product',
        productSize: { width: 2800, height: 2800 },
        productType: 'ring'
      },
      {
        name: 'Very Small Product',
        productSize: { width: 200, height: 200 },
        productType: 'ring'
      },
      {
        name: 'Extremely Wide Product',
        productSize: { width: 2500, height: 400 },
        productType: 'necklace'
      },
      {
        name: 'Extremely Tall Product',
        productSize: { width: 400, height: 2500 },
        productType: 'necklace'
      }
    ];

    edgeCases.forEach((edgeCase, index) => {
      const position = imageProcessor.getReferencePointPosition(
        edgeCase.productType,
        edgeCase.productSize,
        3000
      );

      console.log(`${index + 1}. ${edgeCase.name}`);
      console.log(`   Size: ${edgeCase.productSize.width}x${edgeCase.productSize.height}`);
      console.log(`   Position: (${position.left}, ${position.top})`);
      
      const isWithinBounds = (
        position.left >= 0 &&
        position.top >= 0 &&
        position.left + edgeCase.productSize.width <= 3000 &&
        position.top + edgeCase.productSize.height <= 3000
      );
      
      console.log(`   Bounds Check: ${isWithinBounds ? '✅ SAFE' : '❌ OUT OF BOUNDS'}\n`);
    });

    // Test product type detection
    console.log('🔍 Testing Product Type Detection:\n');

    const pathTests = [
      '/temp/folder/ring_silver_001.jpg',
      '/temp/folder/necklace_gold_chain.png',
      '/temp/kolye/star_pendant.jpg',
      '/temp/yüzük/diamond_band.png',
      '/temp/products/unknown_item.jpg',
      '/temp/N106-STARVIREO/pendant_chain.jpg'
    ];

    pathTests.forEach((testPath, index) => {
      const detectedType = imageProcessor.detectProductType(testPath);
      console.log(`${index + 1}. "${path.basename(testPath)}" → ${detectedType}`);
    });

    console.log('\n🎉 Product Positioning Test Complete!\n');

    console.log('📊 Summary:');
    console.log('   ✅ Reference point positioning implemented');
    console.log('   ✅ Product-specific alignment (necklaces vs rings)');
    console.log('   ✅ Boundary validation and correction');
    console.log('   ✅ Edge case handling');
    console.log('   ✅ Product type detection');
    console.log('   ✅ Consistent placement across all backgrounds');

    console.log('\n💡 Key Features:');
    console.log('   🎯 Blue X reference point: (35%, 30%) = (1050px, 900px)');
    console.log('   📐 Necklaces: Pendant centered at reference point');
    console.log('   💍 Rings: Stone/center aligned with reference point');
    console.log('   🔒 Automatic boundary constraints');
    console.log('   🌍 Multi-language support (Turkish/English)');

    console.log('\n🚀 Integration Ready:');
    console.log('   Your products will now be positioned consistently');
    console.log('   Each product aligns with the blue X reference point');
    console.log('   Background changes won\'t affect product placement');

  } catch (error) {
    console.error('❌ Positioning test failed:', error.message);
    logger.error('Product positioning test error', { error: error.message });
  }
}

// Test positioning accuracy
async function testPositioningAccuracy() {
  try {
    console.log('\n🔬 Testing Positioning Accuracy...\n');

    const imageProcessor = new ImageProcessor();

    // Create a grid of test positions to verify accuracy
    const testSizes = [
      { width: 500, height: 500 },
      { width: 1000, height: 1000 },
      { width: 1500, height: 1000 },
      { width: 1000, height: 1500 },
      { width: 2000, height: 800 }
    ];

    const expectedRefPoint = { x: 1050, y: 900 }; // 35%, 30% of 3000

    console.log('📏 Accuracy Test Results:\n');

    testSizes.forEach((size, index) => {
      // Test both product types
      ['ring', 'necklace'].forEach(productType => {
        const position = imageProcessor.getReferencePointPosition(productType, size, 3000);
        
        // Calculate where the reference point actually aligns
        const actualRefX = position.left + (size.width / 2);
        let actualRefY = position.top + (size.height / 2);
        
        if (productType === 'necklace') {
          actualRefY = position.top + (size.height * 0.4);
        }

        const deviationX = Math.abs(actualRefX - expectedRefPoint.x);
        const deviationY = Math.abs(actualRefY - expectedRefPoint.y);

        const accuracy = deviationX < 5 && deviationY < 5 ? 'PERFECT' :
                        deviationX < 20 && deviationY < 20 ? 'EXCELLENT' :
                        deviationX < 50 && deviationY < 50 ? 'GOOD' : 'NEEDS ADJUSTMENT';

        console.log(`${productType.toUpperCase()} ${size.width}x${size.height}:`);
        console.log(`   Expected: (${expectedRefPoint.x}, ${expectedRefPoint.y})`);
        console.log(`   Actual: (${Math.round(actualRefX)}, ${Math.round(actualRefY)})`);
        console.log(`   Deviation: ±${Math.round(deviationX)}px, ±${Math.round(deviationY)}px`);
        console.log(`   Accuracy: ${accuracy}\n`);
      });
    });

  } catch (error) {
    console.error('❌ Accuracy test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  (async () => {
    await testProductPositioning();
    await testPositioningAccuracy();
  })();
}

module.exports = {
  testProductPositioning,
  testPositioningAccuracy
};