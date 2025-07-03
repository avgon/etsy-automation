const GoogleDriveService = require('./src/services/googleDrive');
const OpenAIService = require('./src/services/openai');
const ImageProcessor = require('./src/services/imageProcessor');
const CSVExportService = require('./src/services/csvExport');
const config = require('./src/config');
const path = require('path');
const fs = require('fs-extra');

class CorrectFullProcess {
  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.openai = new OpenAIService();
    this.imageProcessor = new ImageProcessor();
    this.csvExporter = new CSVExportService();
    this.backgroundsDir = path.join(__dirname, 'test-backgrounds');
  }

  async runCorrectProcess() {
    try {
      console.log('🚀 DOĞRU SİSTEM BAŞLIYOR...\n');
      
      // 1. Drive'dan klasörleri çek (her klasör = bir ürün)
      const folders = await this.googleDrive.pollForNewFolders();
      console.log(`📁 ${folders.length} ürün klasörü bulundu:`);
      folders.forEach(folder => console.log(`  - ${folder.name}`));
      
      // Her klasör için işlem yap
      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        console.log(`\n🎯 ${i + 1}/${folders.length} - ÜRÜN: ${folder.name}\n`);
        
        // 2. Klasörden tüm fotoğrafları çek (aynı ürünün farklı açıları)
        console.log('📸 Ürünün tüm fotoğrafları çekiliyor...');
        const images = await this.googleDrive.getImagesFromFolder(folder.id);
        console.log(`✅ ${images.length} adet fotoğraf bulundu:`);
        images.forEach(img => console.log(`  - ${img.name}`));
        
        // 3. SKU oluştur (klasör adından)
        const sku = this.generateSKU(folder.name);
        console.log(`🏷️ SKU: ${sku}`);
        
        // Çalışma klasörleri
        const workDir = path.join(__dirname, 'correct-process-work', folder.id);
        const finalOutputDir = path.join(__dirname, 'exports', 'images', sku);
        await fs.ensureDir(workDir);
        await fs.ensureDir(finalOutputDir);
        
        // 4. Tüm fotoğrafları indir
        console.log('⬇️ Tüm fotoğraflar indiriliyor...');
        const downloadedImages = [];
        for (const image of images) {
          const imagePath = path.join(workDir, image.name);
          await this.googleDrive.downloadFile(image.id, image.name, workDir);
          downloadedImages.push(imagePath);
          console.log(`  ✅ ${image.name}`);
        }
        
        // 5. TEK SEO İÇERİĞİ OLUŞTUR (orijinal fotoğrafları analiz et)
        console.log('\n📝 Orijinal fotoğraflardan SEO üretiliyor...');
        const productInfo = {
          name: folder.name, // Klasör adı = ürün adı
          type: this.inferProductType(folder.name),
          imageCount: images.length
        };
        
        // SEO GPT'ye orijinal fotoğrafları gönder (arka plan eklemeden önce!)
        const seoContent = await this.openai.generateEtsySEO(productInfo, downloadedImages);
        seoContent.sku = sku;
        console.log(`✅ SEO: "${seoContent.title}"`);
        console.log(`📊 ${images.length} orijinal fotoğraf analiz edildi`);
        
        // 6. Şimdi her fotoğrafı arka planlara giydirme
        console.log('\n🎨 Her fotoğraf arka planlara giydiriliy...');
        const allProcessedImages = [];
        const backgrounds = await this.getAvailableBackgrounds();
        
        for (let j = 0; j < downloadedImages.length; j++) {
          const imagePath = downloadedImages[j];
          const imageName = path.parse(images[j].name).name;
          
          console.log(`\n📷 ${j + 1}/${downloadedImages.length}: ${images[j].name}`);
          
          for (const bgName of backgrounds) {
            const bgPath = path.join(this.backgroundsDir, bgName);
            const outputName = `${imageName}_${bgName}`;
            const outputPath = path.join(finalOutputDir, outputName);
            
            await this.imageProcessor.addProductToBackground(imagePath, bgPath, outputPath);
            allProcessedImages.push(outputPath);
            console.log(`  ✨ ${bgName} tamamlandı`);
          }
        }
        
        // 7. TEK ÜRÜN İÇİN CSV VE REHBER
        console.log('\n📊 Tek ürün için CSV export ve rehber...');
        const productData = {
          title: seoContent.title,
          description: seoContent.description + `\n\nSKU: ${sku}\nFotoğraf Sayısı: ${images.length}`,
          price: seoContent.priceRange ? parseFloat(seoContent.priceRange.split('-')[0]) : 19.99,
          tags: seoContent.tags,
          categories: seoContent.categories,
          quantity: 1,
          sku: sku
        };
        
        const exportResult = await this.csvExporter.exportProduct(productData, allProcessedImages, sku);
        const guideFile = await this.csvExporter.createManualListingGuide(productData, sku);
        
        console.log(`✅ ÜRÜN HAZIR!`);
        console.log(`📸 Orijinal fotoğraf: ${images.length} adet`);
        console.log(`🎨 İşlenmiş görsel: ${allProcessedImages.length} adet`);
        console.log(`💰 Fiyat: $${productData.price}`);
        console.log(`🏷️ Etiketler: ${seoContent.tags.slice(0, 3).join(', ')}...`);
        
        // Temizlik
        await fs.remove(workDir);
        
        // Rate limit için bekleme
        if (i < folders.length - 1) {
          console.log('\n⏳ 5 saniye bekleniyor...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // Özet
      console.log('\n🎉 TÜM ÜRÜNLER TAMAMLANDI!\n');
      console.log('📊 ÖZET RAPOR:');
      console.log(`📁 İşlenen ürün sayısı: ${folders.length}`);
      console.log(`📝 Üretilen SEO içeriği: ${folders.length} adet (ürün başına)`);
      console.log(`📁 CSV dosyası: exports/etsy-products.csv`);
      console.log(`📋 Manuel rehberler: exports/listing-guide-*.md`);
      console.log(`🖼️ İşlenmiş görseller: exports/images/`);
      
      console.log('\n💡 Dosyaları görmek için:');
      console.log('🔗 \\\\wsl.localhost\\Ubuntu\\home\\xmk\\etsy-automation\\exports\\');
      
    } catch (error) {
      console.error('❌ Hata:', error.message);
    }
  }
  
  async getAvailableBackgrounds() {
    const allBackgrounds = ['Back1.jpg', 'Back2.jpg', 'Back3.jpg'];
    const backgrounds = [];
    for (const bg of allBackgrounds) {
      const bgPath = path.join(this.backgroundsDir, bg);
      if (await fs.pathExists(bgPath)) {
        backgrounds.push(bg);
      }
    }
    return backgrounds;
  }
  
  generateSKU(folderName) {
    const cleanName = folderName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 15);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanName}-${timestamp}`;
  }
  
  inferProductType(folderName) {
    const name = folderName.toLowerCase();
    
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

// Doğru sistemi başlat
const correctProcess = new CorrectFullProcess();
correctProcess.runCorrectProcess();