const OpenAIService = require('./src/services/openai');
const config = require('./src/config');

async function testSEOGeneration() {
  console.log('🎯 SEO Creator test ediliyor (GPT-4o fallback)...\n');

  try {
    const openai = new OpenAIService();
    
    const testProduct = {
      name: "Star Vireo Pendant",
      type: "pendant",
      sku: "N106-STARVIREO-TEST"
    };

    // Test için N106-STARVIREO görselleri kullan
    const imagePaths = [
      '/Users/killagoes/Desktop/adsız klasör/etsy-automation/exports/images/N106-STARVIREO-487001/processed_DSC_2698.png'
    ];

    console.log('📝 Test ürünü:', testProduct);
    console.log('🔄 SEO içeriği oluşturuluyor...\n');

    // Custom GPT olmadan test et - geçici olarak null gönder
    const seoContent = await openai.generateEtsySEO(testProduct, imagePaths, null);

    console.log('✅ SEO içeriği başarıyla oluşturuldu!\n');
    console.log('📋 SONUÇLAR:');
    console.log('=' .repeat(50));
    console.log('🏷️  Başlık:', seoContent.title);
    console.log('📏 Başlık uzunluğu:', seoContent.title.length, 'karakter');
    console.log('\n🏃 Etiketler (' + seoContent.tags.length + ' adet):');
    seoContent.tags.forEach((tag, index) => {
      console.log(`   ${index + 1}. "${tag}" (${tag.length} karakter)`);
    });
    console.log('\n💰 Fiyat:', seoContent.price);
    console.log('\n📂 Kategoriler:', Array.isArray(seoContent.categories) ? seoContent.categories.join(', ') : seoContent.categories);
    console.log('\n📝 Açıklama:');
    console.log(seoContent.description);
    console.log('\n🔧 SKU:', testProduct.sku);
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ JSON format test başarılı!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSEOGeneration();