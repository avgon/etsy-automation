const EtsyAutomation = require('./src/index');
const path = require('path');
const fs = require('fs-extra');

// Test ortamı için geçici environment ayarları
process.env.ADD_BACKGROUND = 'true';
process.env.BACKGROUND_TYPE = 'gradient';
process.env.GRADIENT_COLORS = '#FF6B6B,#4ECDC4';
process.env.OUTPUT_IMAGE_SIZE = '1000'; // Daha hızlı test için küçük boyut

async function testFullBackgroundFlow() {
  console.log('Testing full background processing flow...');
  
  try {
    // Create a mock image for testing
    const testDir = path.join(__dirname, 'test-mock');
    await fs.ensureDir(testDir);
    
    // Copy an existing image for testing
    const sourceImage = path.join(__dirname, 'exports/images/VARIOTM-188-080169/lifestyle_DSC_1050.png');
    const testImage = path.join(testDir, 'test-image.png');
    
    if (await fs.pathExists(sourceImage)) {
      await fs.copy(sourceImage, testImage);
      
      // Test the image processing directly
      const ImageProcessor = require('./src/services/imageProcessor');
      const imageProcessor = new ImageProcessor();
      
      const outputPath = path.join(testDir, 'processed-with-background.jpg');
      
      // Test background processing
      await imageProcessor.addBackground(testImage, outputPath, {
        type: 'gradient',
        gradientColors: ['#FF6B6B', '#4ECDC4']
      });
      
      console.log('✅ Background processing test successful!');
      console.log('📁 Test output:', outputPath);
      
      // Check file size
      const stats = await fs.stat(outputPath);
      console.log('📊 File size:', Math.round(stats.size / 1024), 'KB');
      
    } else {
      console.log('❌ Test image not found. Please ensure you have processed images in exports/images/');
    }
    
    // Clean up
    await fs.remove(testDir);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFullBackgroundFlow();