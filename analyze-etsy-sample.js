const XLSX = require('xlsx');
const path = require('path');

function analyzeEtsySample() {
  try {
    console.log('📊 Etsy sample.xlsx dosyası analiz ediliyor...\n');
    
    // Excel dosyasını oku
    const workbook = XLSX.readFile(path.join(__dirname, 'etsy sample.xlsx'));
    
    // Sheet isimlerini göster
    console.log('📋 Sheet isimleri:');
    workbook.SheetNames.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
    
    // İlk sheet'i analiz et
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    console.log(`\n🔍 "${firstSheetName}" sheet'i analiz ediliyor...\n`);
    
    // JSON'a çevir
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      // Header (ilk satır) göster
      console.log('📌 HEADER (Sütun İsimleri):');
      const headers = jsonData[0];
      headers.forEach((header, i) => {
        console.log(`  ${i + 1}. ${header}`);
      });
      
      console.log(`\n📊 Toplam sütun sayısı: ${headers.length}`);
      console.log(`📊 Toplam satır sayısı: ${jsonData.length}`);
      
      // İlk birkaç örnek satırı göster (header hariç)
      if (jsonData.length > 1) {
        console.log('\n📄 İLK ÖRNEK SATIRLAR:');
        for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
          console.log(`\n--- Satır ${i} ---`);
          const row = jsonData[i];
          headers.forEach((header, j) => {
            const value = row[j] || '';
            console.log(`${header}: ${value}`);
          });
        }
      }
      
      // CSV formatı için mapping oluştur
      console.log('\n🛠️ CSV MAPPING ÖNERİSİ:');
      console.log('CSVExportService için gerekli mapping:');
      console.log('```javascript');
      console.log('const etsyHeaders = [');
      headers.forEach(header => {
        console.log(`  '${header}',`);
      });
      console.log('];');
      console.log('```');
      
    } else {
      console.log('❌ Dosya boş veya okunamadı');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

analyzeEtsySample();