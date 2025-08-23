const OpenAIService = require('./src/services/openai');
const ImageProcessor = require('./src/services/imageProcessor');
const CSVExportService = require('./src/services/csvExport');
const config = require('./src/config');
const path = require('path');
const fs = require('fs-extra');

async function testN106StarvireoReal() {
  console.log('🚀 N106-STARVIREO Gerçek Test Başlatılıyor...\n');

  try {
    // Initialize services
    const openai = new OpenAIService();
    const imageProcessor = new ImageProcessor();
    const csvExporter = new CSVExportService();
    
    // Test product info
    const testProduct = {
      name: "N106 STARVIREO 30MM 4.45GR",
      type: "pendant",
      sku: "N106-STARVIREO-REALTEST"
    };

    // Real product images
    const imagePaths = [
      '/Users/killagoes/Desktop/adsız klasör/etsy-automation/exports/images/N106-STARVIREO-487001/processed_DSC_2698.png',
      '/Users/killagoes/Desktop/adsız klasör/etsy-automation/exports/images/N106-STARVIREO-487001/processed_N106 STARVIREO 30MM 4.45GR.png'
    ];

    console.log('📝 Test Ürünü:', testProduct);
    console.log('🖼️ Görsel Sayısı:', imagePaths.length);
    console.log('🔄 Custom GPT ile SEO oluşturuluyor...\n');

    // Generate SEO with Custom GPT
    const seoContent = await openai.generateEtsySEO(testProduct, imagePaths, config.openai.customGptId);

    console.log('✅ SEO İçeriği Oluşturuldu!\n');
    console.log('📋 CUSTOM GPT SONUÇLARI:');
    console.log('=' .repeat(60));
    console.log('🏷️  Başlık:', seoContent.title);
    console.log('📏 Başlık Uzunluğu:', seoContent.title.length, 'karakter');
    
    console.log('\n🏃 Etiketler (' + seoContent.tags.length + ' adet):');
    seoContent.tags.forEach((tag, index) => {
      console.log(`   ${index + 1}. "${tag}" (${tag.length} karakter)`);
    });
    
    console.log('\n💰 Fiyat:', seoContent.price, 'USD');
    console.log('\n📂 Kategoriler:', Array.isArray(seoContent.categories) ? seoContent.categories.join(', ') : seoContent.categories);
    
    console.log('\n📝 Açıklama:');
    console.log(seoContent.description);
    
    console.log('\n' + '=' .repeat(60));

    // Product type detection test
    const detectedType = detectProductType(seoContent);
    console.log('🔍 Algılanan Ürün Tipi:', detectedType);
    
    // Test image processing with detected type
    console.log('\n🖼️ Ürün tipine göre görsel işleme testi...');
    const testImageDir = '/Users/killagoes/Desktop/adsız klasör/etsy-automation/test-outputs';
    await fs.ensureDir(testImageDir);
    
    const testImageOutput = path.join(testImageDir, 'n106-starvireo-final-test.jpg');
    const backgroundPath = '/Users/killagoes/Desktop/adsız klasör/etsy-automation/test-backgrounds/Back1.jpg';
    
    await imageProcessor.addProductToBackground(
      imagePaths[0], 
      backgroundPath, 
      testImageOutput, 
      detectedType
    );
    
    console.log('✅ Görsel işleme tamamlandı:', path.basename(testImageOutput));

    // Export to CSV
    console.log('\n📊 CSV Export testi...');
    const exportResult = await csvExporter.exportProduct(seoContent, imagePaths, testProduct.sku);
    const guideFile = await csvExporter.createManualListingGuide(seoContent, testProduct.sku);

    console.log('\n🎉 TEST TAMAMLANDI!');
    console.log('📁 CSV Dosyası:', exportResult.csvFile);
    console.log('📋 Rehber Dosyası:', guideFile);
    console.log('🖼️ Test Görseli:', testImageOutput);
    console.log('🏷️ SKU:', testProduct.sku);
    
    console.log('\n📌 Kontrol edilecek dosyalar:');
    console.log('   - exports/etsy-products.csv (yeni satır eklendi)');
    console.log('   - exports/listing-guide-*.md (yeni rehber)');
    console.log('   - test-outputs/n106-starvireo-final-test.jpg (büyük boyutlu pendant)');
    
  } catch (error) {
    console.error('❌ Test Hatası:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Product type detection function (copied from main)
function detectProductType(seoContent) {
  const title = (seoContent.title || '').toLowerCase();
  const description = (seoContent.description || '').toLowerCase();
  const tags = Array.isArray(seoContent.tags) ? seoContent.tags.join(' ').toLowerCase() : '';
  
  const combinedText = `${title} ${description} ${tags}`;
  
  // Jewelry detection
  if (combinedText.includes('necklace') || combinedText.includes('pendant') || combinedText.includes('kolye')) {
    return 'pendant';
  }
  if (combinedText.includes('ring') || combinedText.includes('yüzük') || combinedText.includes('yuzuk')) {
    return 'ring';
  }
  if (combinedText.includes('earring') || combinedText.includes('küpe')) {
    return 'earring';
  }
  if (combinedText.includes('bracelet') || combinedText.includes('bilezik')) {
    return 'bracelet';
  }
  
  return 'product';
}

testN106StarvireoReal();