const OpenAIService = require('./src/services/openai');
const config = require('./src/config');

async function testSEOGeneration() {
  console.log('🎯 Killer Listing SEO Creator test ediliyor...\n');

  try {
    const openai = new OpenAIService();
    
    const testProduct = {
      name: "Handmade Ceramic Coffee Mug",
      type: "mug",
      sku: "CERAMIC-MUG-123456"
    };

    console.log('📝 Test ürünü:', testProduct);
    console.log('🔄 SEO içeriği oluşturuluyor...\n');

    const seoContent = await openai.generateEtsySEO(testProduct, config.openai.customGptId);

    console.log('✅ SEO içeriği başarıyla oluşturuldu!\n');
    console.log('📋 SONUÇLAR:');
    console.log('=' .repeat(50));
    console.log('🏷️  Başlık:', seoContent.title);
    console.log('📏 Başlık uzunluğu:', seoContent.title.length, 'karakter');
    console.log('\n🏃 Etiketler (' + seoContent.tags.length + ' adet):');
    seoContent.tags.forEach((tag, index) => {
      console.log(`   ${index + 1}. "${tag}" (${tag.length} karakter)`);
    });
    console.log('\n💰 Fiyat aralığı:', seoContent.priceRange);
    console.log('\n📂 Kategoriler:', seoContent.categories.join(', '));
    console.log('\n📝 Açıklama:');
    console.log(seoContent.description);
    console.log('\n🔧 SKU:', seoContent.sku || testProduct.sku);
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Killer Listing SEO Creator başarıyla çalışıyor!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

testSEOGeneration();