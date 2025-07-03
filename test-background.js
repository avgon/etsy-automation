const ImageProcessor = require('./src/services/imageProcessor');
const path = require('path');

async function testBackgroundFeatures() {
  const imageProcessor = new ImageProcessor();
  
  // Test image paths - you can change these to your actual image paths
  const testImagePath = path.join(__dirname, 'exports/images/VARIOTM-188-080169/lifestyle_DSC_1050.png');
  const outputDir = path.join(__dirname, 'test-outputs');
  
  try {
    // Ensure output directory exists
    require('fs-extra').ensureDirSync(outputDir);
    
    console.log('Testing background features...');
    
    // Test 1: Solid white background
    console.log('1. Testing solid white background...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'solid-white.jpg'), {
      type: 'solid',
      color: '#FFFFFF'
    });
    
    // Test 2: Solid black background
    console.log('2. Testing solid black background...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'solid-black.jpg'), {
      type: 'solid',
      color: '#000000'
    });
    
    // Test 3: Solid custom color background
    console.log('3. Testing solid custom color background...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'solid-blue.jpg'), {
      type: 'solid',
      color: '#4A90E2'
    });
    
    // Test 4: Gradient background
    console.log('4. Testing gradient background...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'gradient.jpg'), {
      type: 'gradient',
      gradientColors: ['#FF6B6B', '#4ECDC4']
    });
    
    // Test 5: Another gradient
    console.log('5. Testing another gradient...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'gradient-blue.jpg'), {
      type: 'gradient',
      gradientColors: ['#667eea', '#764ba2']
    });
    
    console.log('All background tests completed successfully!');
    console.log('Check the test-outputs directory for results.');
    
  } catch (error) {
    console.error('Error testing background features:', error);
  }
}

// Run the test
testBackgroundFeatures();