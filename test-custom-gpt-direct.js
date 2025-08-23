const OpenAI = require('openai');
const config = require('./src/config');

async function testCustomGPTDirect() {
  console.log('🔍 Custom GPT direkt erişim testi...\n');

  try {
    const openai = new OpenAI({
      apiKey: config.openai.apiKey
    });

    console.log('API Key:', config.openai.apiKey ? 'Mevcut' : 'Yok');
    console.log('Custom GPT ID:', config.openai.customGptId);
    console.log('🔄 Direkt API çağrısı yapılıyor...\n');

    const response = await openai.chat.completions.create({
      model: config.openai.customGptId,
      messages: [
        { 
          role: "user", 
          content: "Test message: Create a simple JSON for a silver ring"
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    console.log('✅ Custom GPT erişimi başarılı!');
    console.log('Yanıt:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Custom GPT erişim hatası:');
    console.error('Error Code:', error.status || error.code);
    console.error('Error Message:', error.message);
    
    if (error.status === 404) {
      console.log('\n🔍 Olası Nedenler:');
      console.log('1. Custom GPT ID yanlış olabilir');
      console.log('2. API key ile Custom GPT farklı hesaplarda olabilir');
      console.log('3. Custom GPT API erişimi desteklemiyor olabilir');
      console.log('4. Custom GPT public olmayabilir');
    }
  }
}

testCustomGPTDirect();