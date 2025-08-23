const ImageProcessor = require('./src/services/imageProcessor');
const path = require('path');
const fs = require('fs-extra');

async function testPendantSizing() {
  console.log('🔍 Pendant boyutlandırma testi başlatılıyor...\n');

  try {
    const imageProcessor = new ImageProcessor();
    
    // Test paths
    const inputImage = '/Users/killagoes/Desktop/adsız klasör/etsy-automation/exports/images/N106-STARVIREO-487001/processed_DSC_2698.png';
    const backgroundPath = '/Users/killagoes/Desktop/adsız klasör/etsy-automation/test-backgrounds/Back1.jpg';
    const outputDir = '/Users/killagoes/Desktop/adsız klasör/etsy-automation/test-outputs';
    
    await fs.ensureDir(outputDir);
    
    console.log('📸 Test edilen görsel:', path.basename(inputImage));
    
    // Test 1: Ring sizing (normal - 75%)
    const ringOutput = path.join(outputDir, 'ring-sizing-test.jpg');
    await imageProcessor.addProductToBackground(inputImage, backgroundPath, ringOutput, 'ring');
    console.log('✅ Ring boyutlandırma testi: ring-sizing-test.jpg');
    
    // Test 2: Pendant sizing (büyük - 200%)
    const pendantOutput = path.join(outputDir, 'pendant-sizing-test.jpg');
    await imageProcessor.addProductToBackground(inputImage, backgroundPath, pendantOutput, 'pendant');
    console.log('✅ Pendant boyutlandırma testi: pendant-sizing-test.jpg');
    
    // Test 3: Auto detection (filename based)
    const autoOutput = path.join(outputDir, 'auto-detection-test.jpg');
    await imageProcessor.addProductToBackground(inputImage, backgroundPath, autoOutput);
    console.log('✅ Otomatik algılama testi: auto-detection-test.jpg');
    
    console.log('\n🎉 Testler tamamlandı!');
    console.log('📁 Sonuçları kontrol edin:', outputDir);
    console.log('\n📊 Beklenen sonuçlar:');
    console.log('   - Ring: Normal boyut (75% canvas area)');
    console.log('   - Pendant: Büyük boyut (200% canvas area)');
    console.log('   - Auto: Dosya adından algılanan tip');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
}

testPendantSizing();