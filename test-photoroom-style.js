const ImageProcessor = require('./src/services/imageProcessor');
const GoogleDriveService = require('./src/services/googleDrive');
const path = require('path');
const fs = require('fs-extra');

async function testPhotoRoomStyle() {
  const imageProcessor = new ImageProcessor();
  const googleDrive = new GoogleDriveService();
  
  try {
    console.log('🎯 PhotoRoom tarzı işlem başlıyor...\n');
    
    // 1. Drive'dan orijinal ürün görselini çek
    const folderId = '14r73hRX_RHlyxJY1XIRuOE3AeGCPlMue';
    const images = await googleDrive.getImagesFromFolder(folderId);
    const testImage = images[0]; // İlk görseli al
    
    console.log(`📸 Ürün görseli: ${testImage.name}`);
    
    // Geçici klasör
    const tempDir = path.join(__dirname, 'temp-photoroom-test');
    const outputDir = path.join(__dirname, 'photoroom-results');
    await fs.ensureDir(tempDir);
    await fs.ensureDir(outputDir);
    
    // Ürün görselini indir
    const productPath = path.join(tempDir, testImage.name);
    await googleDrive.downloadFile(testImage.id, testImage.name, tempDir);
    console.log(`✅ Ürün görseli indirildi`);
    
    // 2. Arka plan şablonları
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    const backgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
    
    console.log('\n🎨 Ürünü arka planlara ekliyorum...\n');
    
    for (const bgName of backgrounds) {
      const bgPath = path.join(backgroundsDir, bgName);
      const outputPath = path.join(outputDir, `${testImage.name.split('.')[0]}_on_${bgName}`);
      
      console.log(`📍 ${bgName} işleniyor...`);
      await imageProcessor.addProductToBackground(productPath, bgPath, outputPath);
      console.log(`✅ ${bgName} tamamlandı!`);
    }
    
    console.log('\n🎉 PhotoRoom tarzı işlem tamamlandı!');
    console.log('📁 Sonuçlar:', outputDir);
    
    const results = await fs.readdir(outputDir);
    console.log('\n📸 Oluşturulan dosyalar:');
    results.forEach(file => console.log(`  ✨ ${file}`));
    
    console.log('\n💡 Windows\'ta görmek için:');
    console.log('🔗 \\\\wsl.localhost\\Ubuntu\\home\\xmk\\etsy-automation\\photoroom-results');
    
    // Temizlik
    await fs.remove(tempDir);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

testPhotoRoomStyle();