const ImageProcessor = require('./src/services/imageProcessor');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');

async function createTestBackgrounds() {
  const backgroundsDir = path.join(__dirname, 'test-backgrounds');
  await fs.ensureDir(backgroundsDir);
  
  // Create some test background images
  const backgrounds = [
    { name: 'wood-texture.jpg', color: '#8B4513' },
    { name: 'marble.jpg', color: '#F5F5DC' },
    { name: 'concrete.jpg', color: '#808080' },
    { name: 'fabric.jpg', color: '#E6E6FA' }
  ];
  
  for (const bg of backgrounds) {
    const bgPath = path.join(backgroundsDir, bg.name);
    if (!await fs.pathExists(bgPath)) {
      // Create a simple colored background
      await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 3,
          background: bg.color
        }
      })
      .jpeg({ quality: 90 })
      .toFile(bgPath);
      
      console.log(`Created test background: ${bg.name}`);
    }
  }
  
  return backgroundsDir;
}

async function testCustomBackgrounds() {
  const imageProcessor = new ImageProcessor();
  const testImagePath = path.join(__dirname, 'exports/images/VARIOTM-188-080169/lifestyle_DSC_1050.png');
  const outputDir = path.join(__dirname, 'test-custom-outputs');
  
  try {
    await fs.ensureDir(outputDir);
    
    // Create test backgrounds
    const backgroundsDir = await createTestBackgrounds();
    
    if (!await fs.pathExists(testImagePath)) {
      console.log('❌ Test image not found. Please ensure you have processed images.');
      return;
    }
    
    console.log('Testing custom background features...');
    
    // Test 1: Single custom background
    console.log('1. Testing single custom background...');
    const woodBg = path.join(backgroundsDir, 'wood-texture.jpg');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'wood-background.jpg'), {
      type: 'image',
      backgroundImagePath: woodBg
    });
    
    // Test 2: Random background from folder
    console.log('2. Testing random background selection...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'random-background-1.jpg'), {
      type: 'random',
      backgroundImagePath: backgroundsDir
    });
    
    // Test 3: Another random selection
    console.log('3. Testing another random background...');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'random-background-2.jpg'), {
      type: 'random',
      backgroundImagePath: backgroundsDir
    });
    
    // Test 4: Specific marble background
    console.log('4. Testing marble background...');
    const marbleBg = path.join(backgroundsDir, 'marble.jpg');
    await imageProcessor.addBackground(testImagePath, path.join(outputDir, 'marble-background.jpg'), {
      type: 'image',
      backgroundImagePath: marbleBg
    });
    
    console.log('✅ All custom background tests completed successfully!');
    console.log('📁 Check test-custom-outputs directory for results');
    console.log('🎨 Available backgrounds in test-backgrounds directory');
    
    // List created files
    const files = await fs.readdir(outputDir);
    console.log('\n📸 Created files:');
    files.forEach(file => console.log(`  - ${file}`));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCustomBackgrounds();