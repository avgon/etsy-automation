const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class EtsyBulkUploadService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../exports');
  }

  async createEtsyBulkCSV(products) {
    try {
      await fs.ensureDir(this.outputDir);
      
      const csvFilePath = path.join(this.outputDir, 'etsy-bulk-upload.csv');
      
      // Etsy bulk upload CSV header
      const header = [
        'Title',
        'Description', 
        'Tags',
        'Materials',
        'Price',
        'Quantity',
        'Category ID',
        'Who Made',
        'When Made',
        'Occasion',
        'Style',
        'Processing Time',
        'Image1',
        'Image2',
        'Image3',
        'Image4',
        'Image5',
        'Image6',
        'Image7',
        'Image8',
        'Image9',
        'Image10'
      ].join(',');
      
      await fs.writeFile(csvFilePath, header + '\n');
      
      // Add products
      for (const product of products) {
        const row = this.formatProductForEtsyCSV(product);
        await fs.appendFile(csvFilePath, row + '\n');
      }
      
      logger.info('Etsy bulk upload CSV created', { 
        filePath: csvFilePath, 
        productCount: products.length 
      });
      
      return csvFilePath;
    } catch (error) {
      logger.error('Error creating Etsy bulk CSV', { error: error.message });
      throw error;
    }
  }

  formatProductForEtsyCSV(product) {
    const escapeCSV = (text) => {
      if (!text) return '';
      return `"${text.toString().replace(/"/g, '""')}"`;
    };

    // Etsy-specific formatting
    const tags = Array.isArray(product.tags) 
      ? product.tags.slice(0, 13).join(',') // Max 13 tags
      : product.tags || '';

    const materials = product.materials || 'Handmade';
    const whoMade = 'i_did';
    const whenMade = '2020_2024';
    const occasion = 'Birthday,Anniversary,Christmas,Wedding';
    const style = 'Modern,Minimalist';
    const processingTime = '1-3 business days';
    const categoryId = '68887594'; // Default: Art & Collectibles > Digital

    // Images (up to 10)
    const images = Array(10).fill('').map((_, i) => 
      product.images && product.images[i] ? path.basename(product.images[i]) : ''
    );

    return [
      escapeCSV(product.title),
      escapeCSV(product.description),
      escapeCSV(tags),
      escapeCSV(materials),
      escapeCSV(product.price),
      escapeCSV(product.quantity || 1),
      escapeCSV(categoryId),
      escapeCSV(whoMade),
      escapeCSV(whenMade),
      escapeCSV(occasion),
      escapeCSV(style),
      escapeCSV(processingTime),
      ...images.map(escapeCSV)
    ].join(',');
  }

  async createUploadInstructions(csvFilePath, totalProducts) {
    try {
      const instructionsPath = path.join(this.outputDir, 'etsy-upload-instructions.md');
      
      const instructions = `# Etsy Bulk Upload Rehberi

## Hazırlanan Dosyalar

✅ **CSV Dosyası**: \`${path.basename(csvFilePath)}\`
✅ **Ürün Sayısı**: ${totalProducts}
✅ **Görseller**: \`exports/images/\` klasöründe

## Etsy Bulk Upload Adımları

### 1. Etsy Shop Manager'a Gidin
- https://www.etsy.com/your/shop/tools/bulk-edit
- Sol menüden **"Listings"** > **"Add listings"** seçin

### 2. Bulk Upload Seçeneğini Kullanın
- **"Upload a CSV file"** seçeneğini tıklayın
- Hazırladığımız \`${path.basename(csvFilePath)}\` dosyasını yükleyin

### 3. Görselleri Hazırlayın
- \`exports/images/\` klasöründeki tüm görselleri bir ZIP dosyasına ekleyin
- ZIP dosyasını Etsy'ye yükleyin

### 4. Ürün Bilgilerini Kontrol Edin
- Her ürün için:
  - ✅ Title: Otomatik dolduruldu
  - ✅ Description: SEO optimizasyonlu
  - ✅ Tags: 13 adet etiket
  - ✅ Price: Önerilen fiyat
  - ⚠️  Shipping: Manuel ayarlamanız gerekiyor
  - ⚠️  Return Policy: Manuel ayarlamanız gerekiyor

### 5. Son Kontroller
- Tüm görsellerin doğru ürünle eşleştiğini kontrol edin
- Fiyatları gözden geçirin
- Stok miktarlarını ayarlayın

### 6. Yayınlayın
- **"Publish all"** butonuna tıklayın
- Ürünleriniz Etsy'de yayına çıkacak

## Önemli Notlar

⚠️ **Shipping Templates**: Etsy Shop'unuzda shipping template'i olması gerekiyor
⚠️ **Return Policy**: Shop policy'lerinizi önceden ayarlayın
⚠️ **Category**: Ürünlere uygun kategori seçin (varsayılan: Art & Collectibles)
⚠️ **Keywords**: Title ve description'larda SEO keywords kullanıldı

## Destek

Bulk upload sırasında sorun yaşarsanız:
1. Etsy Help Center'a başvurun
2. CSV formatını kontrol edin
3. Görsel boyutlarını kontrol edin (max 10MB per image)

---
*Bu rehber ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu.*
`;

      await fs.writeFile(instructionsPath, instructions);
      
      logger.info('Upload instructions created', { instructionsPath });
      
      return instructionsPath;
    } catch (error) {
      logger.error('Error creating upload instructions', { error: error.message });
      throw error;
    }
  }
}

module.exports = EtsyBulkUploadService;