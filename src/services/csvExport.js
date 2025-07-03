const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class CSVExportService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../exports');
  }

  async exportProduct(productData, imagePaths, sku) {
    try {
      await fs.ensureDir(this.outputDir);
      
      const csvRow = this.formatProductForCSV(productData, imagePaths, sku);
      const csvFilePath = path.join(this.outputDir, 'etsy-products.csv');
      
      // Create header if file doesn't exist
      const fileExists = await fs.pathExists(csvFilePath);
      if (!fileExists) {
        const header = this.getCSVHeader();
        await fs.writeFile(csvFilePath, header + '\n');
      }
      
      // Append product data
      await fs.appendFile(csvFilePath, csvRow + '\n');
      
      // Export detailed product info
      const detailsPath = path.join(this.outputDir, `product-${sku}.json`);
      await fs.writeFile(detailsPath, JSON.stringify({
        sku,
        productData,
        imagePaths,
        exportDate: new Date().toISOString()
      }, null, 2));
      
      logger.info('Product exported to CSV', { sku, csvFilePath, detailsPath });
      
      return {
        csvFile: csvFilePath,
        detailsFile: detailsPath,
        imageCount: imagePaths.length
      };
    } catch (error) {
      logger.error('Error exporting product to CSV', { error: error.message, sku });
      throw error;
    }
  }

  getCSVHeader() {
    // Etsy resmi bulk upload formatı
    return [
      'TITLE',
      'DESCRIPTION',
      'PRICE',
      'CURRENCY_CODE',
      'QUANTITY',
      'TAGS',
      'MATERIALS',
      'IMAGE1',
      'IMAGE2',
      'IMAGE3',
      'IMAGE4',
      'IMAGE5',
      'IMAGE6',
      'IMAGE7',
      'IMAGE8',
      'IMAGE9',
      'IMAGE10',
      'VARIATION 1 TYPE',
      'VARIATION 1 NAME',
      'VARIATION 1 VALUES',
      'VARIATION 2 TYPE',
      'VARIATION 2 NAME',
      'VARIATION 2 VALUES',
      'SKU'
    ].join(',');
  }

  formatProductForCSV(productData, imagePaths, sku) {
    const escapeCSV = (text) => {
      if (!text) return '';
      return `"${text.toString().replace(/"/g, '""')}"`;
    };

    // Etsy supports up to 10 images
    const images = Array(10).fill('').map((_, i) => 
      imagePaths[i] ? this.getImageURL(imagePaths[i]) : ''
    );

    // Etsy formatına göre sırala
    return [
      escapeCSV(productData.title),                    // TITLE
      escapeCSV(productData.description),              // DESCRIPTION  
      escapeCSV(productData.price),                    // PRICE
      escapeCSV('USD'),                                // CURRENCY_CODE
      escapeCSV(productData.quantity || 1),           // QUANTITY
      escapeCSV(Array.isArray(productData.tags) ? productData.tags.join(',') : productData.tags), // TAGS
      escapeCSV(this.inferMaterials(productData)),    // MATERIALS
      ...images.map(escapeCSV),                        // IMAGE1-IMAGE10
      escapeCSV(''),                                   // VARIATION 1 TYPE
      escapeCSV(''),                                   // VARIATION 1 NAME  
      escapeCSV(''),                                   // VARIATION 1 VALUES
      escapeCSV(''),                                   // VARIATION 2 TYPE
      escapeCSV(''),                                   // VARIATION 2 NAME
      escapeCSV(''),                                   // VARIATION 2 VALUES
      escapeCSV(sku)                                   // SKU
    ].join(',');
  }

  getImageURL(imagePath) {
    // For now return file path, later can be updated to actual URLs
    return path.basename(imagePath);
  }

  inferMaterials(productData) {
    // Try to infer materials from title or description
    const text = (productData.title + ' ' + productData.description).toLowerCase();
    
    if (text.includes('silver')) return 'Silver';
    if (text.includes('gold')) return 'Gold';
    if (text.includes('leather')) return 'Leather';
    if (text.includes('wood')) return 'Wood';
    if (text.includes('cotton')) return 'Cotton';
    if (text.includes('ceramic')) return 'Ceramic';
    if (text.includes('metal')) return 'Metal';
    
    return 'Mixed Materials'; // Default
  }

  async createManualListingGuide(productData, sku) {
    try {
      const guidePath = path.join(this.outputDir, `listing-guide-${sku}.md`);
      
      const guide = `# Etsy Listeleme Rehberi - ${sku}

## Ürün Bilgileri

### Başlık
\`\`\`
${productData.title}
\`\`\`

### Açıklama
\`\`\`
${productData.description}
\`\`\`

### Fiyat
**${productData.price} USD**

### Etiketler (13 adet)
${productData.tags.map((tag, i) => `${i + 1}. ${tag}`).join('\n')}

### Kategoriler
${productData.categories.join(', ')}

### Stok Miktarı
${productData.quantity || 1}

## Etsy'ye Manuel Ekleme Adımları

1. **Etsy Shop Manager**'a gidin
2. **"Add a listing"** butonuna tıklayın
3. **Fotoğrafları yükleyin** (processed images klasöründen)
4. **Yukarıdaki bilgileri kopyala-yapıştır** yapın
5. **Shipping** ve **Return policy** ayarlarını yapın
6. **Publish** edin

## SKU Takibi
- **SKU**: ${sku}
- **Oluşturulma Tarihi**: ${new Date().toLocaleString('tr-TR')}

---
*Bu rehber otomatik olarak oluşturulmuştur.*
`;

      await fs.writeFile(guidePath, guide);
      logger.info('Manual listing guide created', { sku, guidePath });
      
      return guidePath;
    } catch (error) {
      logger.error('Error creating manual listing guide', { error: error.message, sku });
      throw error;
    }
  }
}

module.exports = CSVExportService;