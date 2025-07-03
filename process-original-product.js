const GoogleDriveService = require('./src/services/googleDrive');
const ImageProcessor = require('./src/services/imageProcessor');
const path = require('path');
const fs = require('fs-extra');

async function processOriginalProductImages() {
  const googleDrive = new GoogleDriveService();
  const imageProcessor = new ImageProcessor();
  
  try {
    console.log('🔄 Drive\'dan orijinal ürün görsellerini çekiyorum...\n');
    
    // VarioTM-188 klasörünün ID'si (loglardan aldık)
    const folderId = '14r73hRX_RHlyxJY1XIRuOE3AeGCPlMue';
    
    // Drive'dan görselleri çek
    const images = await googleDrive.getImagesFromFolder(folderId);
    console.log(`📸 ${images.length} görsel bulundu:`);
    images.forEach(img => console.log(`  - ${img.name}`));
    
    // Çalışma klasörü oluştur
    const workDir = path.join(__dirname, 'fresh-product-processing');
    await fs.ensureDir(workDir);
    
    // Arka plan şablonları klasörü
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    const resultsDir = path.join(__dirname, 'original-product-with-backgrounds');
    await fs.ensureDir(resultsDir);
    
    console.log('\n🎨 Her görsel için arka plan şablonları oluşturuluyor...\n');
    
    for (const image of images) {
      console.log(`\n📷 İşleniyor: ${image.name}`);
      
      // Orijinal görseli indir
      const originalPath = path.join(workDir, `original_${image.name}`);
      await googleDrive.downloadFile(image.id, `original_${image.name}`, workDir);
      console.log(`  ✅ İndirildi: ${image.name}`);
      
      // Her arka plan şablonu için işle
      const backgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
      
      for (const bgName of backgrounds) {
        const bgPath = path.join(backgroundsDir, bgName);
        const outputName = `${path.parse(image.name).name}_with_${bgName}`;
        const outputPath = path.join(resultsDir, outputName);
        
        try {
          await imageProcessor.addBackground(originalPath, outputPath, {
            type: 'image',
            backgroundImagePath: bgPath
          });
          console.log(`  ✨ ${bgName} ile ürün hazır: ${outputName}`);
        } catch (error) {
          console.log(`  ❌ ${bgName} ile hata: ${error.message}`);
        }
      }
      
      // Rastgele arka plan da ekle
      try {
        const randomOutputPath = path.join(resultsDir, `${path.parse(image.name).name}_random_background.jpg`);
        await imageProcessor.addBackground(originalPath, randomOutputPath, {
          type: 'random',
          backgroundImagePath: backgroundsDir
        });
        console.log(`  🎲 Rastgele arka plan ile hazır`);
      } catch (error) {
        console.log(`  ❌ Rastgele arka plan hatası: ${error.message}`);
      }
    }
    
    console.log('\n🎉 TÜM İŞLEMLER TAMAMLANDI!');
    console.log('📁 Sonuçlar:', resultsDir);
    
    // Sonuçları listele
    const results = await fs.readdir(resultsDir);
    console.log(`\n📸 ${results.length} görsel oluşturuldu:`);
    results.forEach(file => console.log(`  ✨ ${file}`));
    
    console.log('\n💡 Windows\'ta görmek için:');
    console.log('🔗 \\\\wsl.localhost\\Ubuntu\\home\\xmk\\etsy-automation\\original-product-with-backgrounds');
    
    // Temizlik
    await fs.remove(workDir);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

processOriginalProductImages();