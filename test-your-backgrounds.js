const ImageProcessor = require('./src/services/imageProcessor');
const path = require('path');
const fs = require('fs-extra');

async function testYourBackgrounds() {
  const imageProcessor = new ImageProcessor();
  
  // Ürün görseliniz
  const productImagePath = path.join(__dirname, 'exports/images/VARIOTM-188-080169/lifestyle_DSC_1050.png');
  
  // Arka plan şablonları
  const backgroundsDir = path.join(__dirname, 'test-backgrounds');
  const outputDir = path.join(__dirname, 'your-products-with-backgrounds');
  
  try {
    await fs.ensureDir(outputDir);
    
    if (!await fs.pathExists(productImagePath)) {
      console.log('❌ Ürün görseli bulunamadı:', productImagePath);
      return;
    }
    
    console.log('🎨 Ürününüzü arka plan şablonlarına ekliyorum...\n');
    
    // Back1.jpg ile test
    console.log('1. Back1.jpg şablonu ile işleniyor...');
    const back1Path = path.join(backgroundsDir, 'Back1.jpg');
    await imageProcessor.addBackground(
      productImagePath, 
      path.join(outputDir, 'product-with-Back1.jpg'), 
      {
        type: 'image',
        backgroundImagePath: back1Path
      }
    );
    console.log('✅ Back1.jpg ile ürün hazır!');
    
    // Back2.jpg ile test
    console.log('\n2. Back2.jpg şablonu ile işleniyor...');
    const back2Path = path.join(backgroundsDir, 'Back2.jpg');
    await imageProcessor.addBackground(
      productImagePath, 
      path.join(outputDir, 'product-with-Back2.jpg'), 
      {
        type: 'image',
        backgroundImagePath: back2Path
      }
    );
    console.log('✅ Back2.jpg ile ürün hazır!');
    
    // Back3.jpg ile test
    console.log('\n3. Back3.jpg şablonu ile işleniyor...');
    const back3Path = path.join(backgroundsDir, 'Back3.jpg');
    await imageProcessor.addBackground(
      productImagePath, 
      path.join(outputDir, 'product-with-Back3.jpg'), 
      {
        type: 'image',
        backgroundImagePath: back3Path
      }
    );
    console.log('✅ Back3.jpg ile ürün hazır!');
    
    // Rastgele seçim testi (tüm şablonlarınızdan rastgele seçecek)
    console.log('\n4. Rastgele arka plan seçimi...');
    await imageProcessor.addBackground(
      productImagePath, 
      path.join(outputDir, 'product-random-background.jpg'), 
      {
        type: 'random',
        backgroundImagePath: backgroundsDir
      }
    );
    console.log('✅ Rastgele arka plan ile ürün hazır!');
    
    console.log('\n🎉 TÜM İŞLEMLER TAMAMLANDI!');
    console.log('📁 Sonuçlar şu klasörde:', outputDir);
    console.log('\n📸 Oluşturulan dosyalar:');
    
    const files = await fs.readdir(outputDir);
    files.forEach(file => {
      console.log(`  ✨ ${file}`);
    });
    
    console.log('\n💡 Bu klasörü Windows\'ta görmek için:');
    console.log('🔗 \\\\wsl.localhost\\Ubuntu\\home\\xmk\\etsy-automation\\your-products-with-backgrounds');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

testYourBackgrounds();