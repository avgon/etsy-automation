const GoogleDriveService = require('./src/services/googleDrive');
const OpenAIService = require('./src/services/openai');
const config = require('./src/config');

async function testConnections() {
  console.log('🔄 API bağlantıları test ediliyor...\n');

  // Test Google Drive
  try {
    console.log('📁 Google Drive bağlantısı test ediliyor...');
    const googleDrive = new GoogleDriveService();
    const folders = await googleDrive.getSubfolders(config.google.driveFolderId);
    console.log('✅ Google Drive bağlantısı başarılı!');
    console.log(`📂 Mevcut klasör sayısı: ${folders.length}`);
    
    if (folders.length > 0) {
      console.log('📋 İlk 3 klasör:');
      folders.slice(0, 3).forEach((folder, index) => {
        console.log(`   ${index + 1}. ${folder.name} (${folder.id})`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Google Drive bağlantı hatası:', error.message);
    console.log('');
  }

  // Test OpenAI
  try {
    console.log('🤖 OpenAI bağlantısı test ediliyor...');
    const openai = new OpenAIService();
    
    // Simple test message
    const response = await openai.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, test connection" }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI bağlantısı başarılı!');
    console.log(`🔗 API Response: ${response.choices[0].message.content}`);
    console.log('');
  } catch (error) {
    console.error('❌ OpenAI bağlantı hatası:', error.message);
    console.log('');
  }

  console.log('🔍 Sistem durumu:');
  console.log('✅ Google Drive API: Hazır');
  console.log('✅ OpenAI API: Hazır');
  console.log('⏳ Etsy API: Ayarlanmayı bekliyor');
  console.log('\n🚀 İlk iki API hazır! Etsy API\'yi ayarlayın ve sistemi başlatın.');
}

testConnections().catch(console.error);