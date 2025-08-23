const IntelligentImageProcessor = require('./src/services/intelligentImageProcessor');
const path = require('path');
const fs = require('fs-extra');

async function testIntelligentProcessing() {
  try {
    console.log('🧠 Testing Intelligent Image Processing System...\n');
    
    const processor = new IntelligentImageProcessor();
    
    // Test paths - you can adjust these
    const testProductPath = path.join(__dirname, 'temp/test-product.jpg'); // Your product image
    const testBackgroundPath = path.join(__dirname, 'test-backgrounds/Back1.jpg');
    const outputDir = path.join(__dirname, 'test-intelligent-outputs');
    
    await fs.ensureDir(outputDir);
    
    // Check if test files exist
    if (!await fs.pathExists(testBackgroundPath)) {
      console.log('❌ Background test file not found:', testBackgroundPath);
      console.log('Please ensure test-backgrounds/Back1.jpg exists');
      return;
    }
    
    // Test 1: Background Analysis
    console.log('🔍 Test 1: Background Analysis');
    try {
      const backgroundAnalysis = await processor.analyzeBackground(testBackgroundPath);
      console.log('✅ Background Analysis Result:');
      console.log('  Style:', backgroundAnalysis.style);
      console.log('  Color Scheme:', backgroundAnalysis.colorScheme);
      console.log('  Optimal Region:', backgroundAnalysis.optimalRegions?.primary);
      console.log('  Jewelry Score:', backgroundAnalysis.productSuitability?.jewelry);
      console.log('');
    } catch (error) {
      console.log('❌ Background analysis failed:', error.message);
    }
    
    // Test 2: Product Analysis (if product exists)
    if (await fs.pathExists(testProductPath)) {
      console.log('🔍 Test 2: Product Analysis');
      try {
        const productAnalysis = await processor.analyzeProduct(testProductPath);
        console.log('✅ Product Analysis Result:');
        console.log('  Product Type:', productAnalysis.productType);
        console.log('  Has Chain:', productAnalysis.chainInfo?.hasChain);
        console.log('  Chain Length:', productAnalysis.chainInfo?.chainLength);
        console.log('  Size Category:', productAnalysis.visualFocus?.size);
        console.log('  Special Needs:', productAnalysis.positioningNeeds?.specialConsiderations);
        console.log('');
        
        // Test 3: Full Intelligent Processing
        console.log('🔍 Test 3: Full Intelligent Processing');
        const outputPath = path.join(outputDir, 'intelligent-test-result.jpg');
        
        const result = await processor.processProductWithIntelligentBackground(
          testProductPath,
          testBackgroundPath,
          outputPath
        );
        
        console.log('✅ Intelligent Processing Complete:');
        console.log('  Output:', result.outputPath);
        console.log('  Strategy:', result.analysis.positioning.strategy);
        console.log('  Final Size:', `${result.analysis.positioning.size.width}x${result.analysis.positioning.size.height}`);
        console.log('  Position:', `${result.analysis.positioning.position.left},${result.analysis.positioning.position.top}`);
        console.log('');
        
        // Test 4: Multiple Backgrounds
        console.log('🔍 Test 4: Multiple Background Processing');
        const multiResults = await processor.createIntelligentBackgroundCombinations(
          testProductPath,
          outputDir,
          'multi-test.jpg'
        );
        
        console.log('✅ Multiple Backgrounds Complete:');
        multiResults.forEach((result, index) => {
          console.log(`  Background ${index + 1}: ${result.backgroundName}`);
          console.log(`    Strategy: ${result.analysis.positioning.strategy}`);
          console.log(`    Output: ${path.basename(result.outputPath)}`);
        });
        
      } catch (error) {
        console.log('❌ Product analysis/processing failed:', error.message);
      }
    } else {
      console.log('⚠️  Test product image not found:', testProductPath);
      console.log('   Place a product image at this path to test full processing');
      console.log('   Testing background analysis only...\n');
    }
    
    // Test 5: Positioning Algorithm Test
    console.log('🔍 Test 5: Positioning Algorithm');
    const mockBackgroundAnalysis = {
      style: 'luxury marble',
      colorScheme: 'warm gold tones',
      optimalRegions: { primary: 'center' },
      productSuitability: { jewelry: 9 }
    };
    
    const mockProductAnalysis = {
      productType: 'necklace',
      chainInfo: { hasChain: true, chainLength: 'long', chainVisibility: 'full' },
      visualFocus: { size: 'medium', detail: 'high' },
      positioningNeeds: { specialConsiderations: 'show full chain length' }
    };
    
    const positioning = processor.calculateOptimalPositioning(
      mockBackgroundAnalysis,
      mockProductAnalysis,
      3000
    );
    
    console.log('✅ Positioning Algorithm Result:');
    console.log('  Strategy:', positioning.strategy);
    console.log('  Size:', `${positioning.size.width}x${positioning.size.height}`);
    console.log('  Position:', `${positioning.position.left},${positioning.position.top}`);
    console.log('  Area Coverage:', ((positioning.size.width * positioning.size.height) / (3000 * 3000) * 100).toFixed(1) + '%');
    
    console.log('\n🎉 All Tests Completed!');
    console.log('📁 Check output directory:', outputDir);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Alternative test with existing product images
async function testWithExistingProducts() {
  try {
    console.log('🧠 Testing with existing product images...\n');
    
    const processor = new IntelligentImageProcessor();
    const outputDir = path.join(__dirname, 'test-intelligent-outputs');
    await fs.ensureDir(outputDir);
    
    // Look for existing product images in common locations
    const possiblePaths = [
      path.join(__dirname, 'temp'),
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'original-product-with-backgrounds'),
      path.join(__dirname, 'your-products-with-backgrounds')
    ];
    
    let productFound = false;
    
    for (const searchPath of possiblePaths) {
      if (await fs.pathExists(searchPath)) {
        const files = await fs.readdir(searchPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png'].includes(ext);
        });
        
        if (imageFiles.length > 0) {
          const testProduct = path.join(searchPath, imageFiles[0]);
          console.log('✅ Found test product:', testProduct);
          
          // Test with this product
          const backgroundPath = path.join(__dirname, 'test-backgrounds/Back1.jpg');
          if (await fs.pathExists(backgroundPath)) {
            const outputPath = path.join(outputDir, `intelligent_${imageFiles[0]}`);
            
            const result = await processor.processProductWithIntelligentBackground(
              testProduct,
              backgroundPath,
              outputPath
            );
            
            console.log('🎉 Processing complete!');
            console.log('📁 Result:', result.outputPath);
            productFound = true;
            break;
          }
        }
      }
    }
    
    if (!productFound) {
      console.log('⚠️  No product images found in standard locations');
      console.log('   Try placing a product image in temp/ directory');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  // Command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--existing')) {
    testWithExistingProducts();
  } else {
    testIntelligentProcessing();
  }
}

module.exports = { testIntelligentProcessing, testWithExistingProducts };