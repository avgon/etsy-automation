const GoogleDriveService = require('./src/services/googleDrive');
const OpenAIService = require('./src/services/openai');
const ImageProcessor = require('./src/services/imageProcessor');
const CSVExportService = require('./src/services/csvExport');
const config = require('./src/config');
const path = require('path');
const fs = require('fs-extra');

class FullProcessTest {
  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.openai = new OpenAIService();
    this.imageProcessor = new ImageProcessor();
    this.csvExporter = new CSVExportService();
    this.backgroundsDir = path.join(__dirname, 'test-backgrounds');
  }

  async runFullProcess() {
    try {
      console.log('🚀 TAM OTOMATİK SÜREÇ BAŞLIYOR...\n');
      
      // 1. Drive'dan tüm ürün fotoğraflarını çek
      const folderId = '14r73hRX_RHlyxJY1XIRuOE3AeGCPlMue';
      console.log('📁 Drive klasöründen fotoğraflar çekiliyor...');
      const images = await this.googleDrive.getImagesFromFolder(folderId);
      console.log(`📸 ${images.length} adet fotoğraf bulundu:`);
      images.forEach(img => console.log(`  - ${img.name}`));
      
      // Çalışma klasörleri
      const workDir = path.join(__dirname, 'full-process-work');
      const finalOutputDir = path.join(__dirname, 'exports', 'full-test-results');
      await fs.ensureDir(workDir);
      await fs.ensureDir(finalOutputDir);
      
      // Her fotoğraf için tam süreç
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`\n🎯 ${i + 1}/${images.length} - ${image.name} İŞLENİYOR...\n`);
        
        // 2. Fotoğrafı indir
        console.log('⬇️ Fotoğraf indiriliyor...');
        const originalPath = path.join(workDir, `original_${image.name}`);
        await this.googleDrive.downloadFile(image.id, `original_${image.name}`, workDir);
        console.log('✅ İndirildi!');
        
        // 3. SKU oluştur
        const sku = this.generateSKU(image.name);
        console.log(`🏷️ SKU: ${sku}`);
        
        // 4. Arka plan şablonları ile görsel oluştur
        console.log('🎨 Arka plan şablonları ekleniyor...');
        const processedImages = [];
        // Mevcut arka plan dosyalarını kontrol et
        const allBackgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
        const backgrounds = [];
        for (const bg of allBackgrounds) {
          const bgPath = path.join(this.backgroundsDir, bg);
          if (await fs.pathExists(bgPath)) {
            backgrounds.push(bg);
          }
        }
        
        for (const bgName of backgrounds) {
          const bgPath = path.join(this.backgroundsDir, bgName);
          const outputName = `${sku}_${bgName}`;
          const outputPath = path.join(finalOutputDir, outputName);
          
          await this.imageProcessor.addProductToBackground(originalPath, bgPath, outputPath);
          processedImages.push(outputPath);
          console.log(`  ✨ ${bgName} tamamlandı`);
        }
        
        // 5. SEO içeriği üret
        console.log('📝 SEO içeriği üretiliyor...');
        const productInfo = {
          name: image.name.replace(/\.(png|jpg|jpeg)$/i, ''),
          type: this.inferProductType(image.name),
          sku: sku
        };
        
        const seoContent = await this.openai.generateEtsySEO(productInfo, config.openai.customGptId);
        seoContent.sku = sku;
        console.log(`✅ SEO: "${seoContent.title}"`);
        
        // 6. CSV'ye ekle ve rehber oluştur
        console.log('📊 CSV export ve rehber oluşturuluyor...');
        const productData = {
          title: seoContent.title,
          description: seoContent.description + `\n\nSKU: ${sku}`,
          price: seoContent.priceRange ? parseFloat(seoContent.priceRange.split('-')[0]) : 19.99,
          tags: seoContent.tags,
          categories: seoContent.categories,
          quantity: 1,
          sku: sku
        };
        
        const exportResult = await this.csvExporter.exportProduct(productData, processedImages, sku);
        const guideFile = await this.csvExporter.createManualListingGuide(productData, sku);
        
        console.log('✅ CSV ve rehber hazır!');
        console.log(`💰 Fiyat: $${productData.price}`);
        console.log(`🏷️ Etiketler: ${seoContent.tags.slice(0, 3).join(', ')}...`);
        
        // Kısa bekleme (API rate limit için)
        if (i < images.length - 1) {
          console.log('⏳ 3 saniye bekleniyor...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // 7. Özet rapor
      console.log('\n🎉 TÜM SÜREÇ TAMAMLANDI!\n');
      console.log('📊 ÖZET RAPOR:');
      console.log(`📸 İşlenen fotoğraf sayısı: ${images.length}`);
      console.log(`🎨 Oluşturulan görsel sayısı: ${images.length * 3}`);
      console.log(`📝 Üretilen SEO içeriği: ${images.length} adet`);
      console.log(`📁 CSV dosyası: exports/etsy-products.csv`);
      console.log(`📋 Manuel rehberler: exports/listing-guide-*.md`);
      console.log(`🖼️ İşlenmiş görseller: exports/full-test-results/`);
      
      console.log('\n💡 Dosyaları görmek için:');
      console.log('🔗 \\\\wsl.localhost\\Ubuntu\\home\\xmk\\etsy-automation\\exports\\');
      
      // Temizlik
      await fs.remove(workDir);
      
    } catch (error) {
      console.error('❌ Hata:', error.message);
    }
  }
  
  generateSKU(imageName) {
    const cleanName = imageName
      .replace(/\.(png|jpg|jpeg)$/i, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 15);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanName}-${timestamp}`;
  }
  
  inferProductType(imageName) {
    const name = imageName.toLowerCase();
    
    if (name.includes('mug') || name.includes('cup')) return 'mug';
    if (name.includes('shirt') || name.includes('tshirt') || name.includes('tee')) return 'shirt';
    if (name.includes('poster') || name.includes('print')) return 'poster';
    if (name.includes('pillow') || name.includes('cushion')) return 'pillow';
    if (name.includes('bag') || name.includes('tote')) return 'bag';
    if (name.includes('phone') || name.includes('case')) return 'phone case';
    if (name.includes('sticker')) return 'sticker';
    if (name.includes('card')) return 'greeting card';
    
    return 'product';
  }
}

// Testi başlat
const test = new FullProcessTest();
test.runFullProcess();