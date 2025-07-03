const fs = require('fs-extra');
const path = require('path');
const EtsyBulkUploadService = require('./src/services/etsyBulkUpload');

async function createBulkUpload() {
  try {
    console.log('🔄 Etsy Bulk Upload dosyaları oluşturuluyor...\n');
    
    const bulkUploader = new EtsyBulkUploadService();
    
    // Read all product JSON files
    const exportsDir = path.join(__dirname, 'exports');
    const files = await fs.readdir(exportsDir);
    const productFiles = files.filter(f => f.startsWith('product-') && f.endsWith('.json'));
    
    if (productFiles.length === 0) {
      console.log('❌ Henüz işlenmiş ürün bulunamadı. Önce sistemi çalıştırın.');
      return;
    }
    
    console.log(`📦 ${productFiles.length} ürün bulundu`);
    
    // Load all products
    const products = [];
    for (const file of productFiles) {
      const productPath = path.join(exportsDir, file);
      const productData = await fs.readJson(productPath);
      
      // Find images for this product
      const sku = productData.sku;
      const imagesDir = path.join(exportsDir, 'images', sku);
      let images = [];
      
      if (await fs.pathExists(imagesDir)) {
        const imageFiles = await fs.readdir(imagesDir);
        images = imageFiles
          .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
          .map(f => path.join(imagesDir, f));
      }
      
      products.push({
        ...productData.productData,
        images: images,
        sku: sku
      });
      
      console.log(`✅ ${sku}: ${productData.productData.title}`);
    }
    
    // Create Etsy bulk upload CSV
    const csvPath = await bulkUploader.createEtsyBulkCSV(products);
    console.log(`\n📁 CSV Dosyası: ${csvPath}`);
    
    // Create upload instructions
    const instructionsPath = await bulkUploader.createUploadInstructions(csvPath, products.length);
    console.log(`📋 Rehber: ${instructionsPath}`);
    
    // Create images zip preparation script
    await createImageZipScript(products);
    
    console.log('\n🎉 Etsy Bulk Upload hazır!');
    console.log('\n📌 Sonraki adımlar:');
    console.log('1. exports/etsy-upload-instructions.md dosyasını okuyun');
    console.log('2. node create-images-zip.js çalıştırın');
    console.log('3. Etsy Shop Manager\'da bulk upload yapın');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

async function createImageZipScript(products) {
  const script = `const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function createImagesZip() {
  try {
    console.log('🔄 Görsel ZIP dosyası oluşturuluyor...');
    
    const output = fs.createWriteStream('exports/etsy-images.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', function() {
      console.log('✅ ZIP dosyası oluşturuldu: ' + archive.pointer() + ' bytes');
      console.log('📁 Dosya: exports/etsy-images.zip');
    });
    
    archive.on('error', function(err) {
      throw err;
    });
    
    archive.pipe(output);
    
    const products = ${JSON.stringify(products, null, 2)};
    
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          const imagePath = product.images[i];
          if (await fs.pathExists(imagePath)) {
            const fileName = \`\${product.sku}_\${i + 1}_\${path.basename(imagePath)}\`;
            archive.file(imagePath, { name: fileName });
            console.log(\`📸 Eklendi: \${fileName}\`);
          }
        }
      }
    }
    
    await archive.finalize();
  } catch (error) {
    console.error('❌ ZIP oluşturma hatası:', error.message);
  }
}

createImagesZip();`;

  await fs.writeFile(path.join(__dirname, 'create-images-zip.js'), script);
  console.log('📦 Görsel ZIP script\'i oluşturuldu: create-images-zip.js');
}

createBulkUpload();