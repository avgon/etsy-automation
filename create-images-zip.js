const fs = require('fs-extra');
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
    
    const products = [
  {
    "title": "VarioTM-188 Unique Product, High-Quality, Ideal for Everyday Use, Perfect Gift",
    "description": "Introducing the VarioTM-188 - a unique, high-quality product designed with your needs in mind. Ideal for everyday use, our product is crafted with care, ensuring durability and longevity. This item is not just a purchase, it's an investment. VarioTM-188 is the perfect gift for your loved ones or a delightful treat for yourself. As a bestseller, it's a must-have addition to your shopping cart. With its trendy design and excellent value for money, it's highly rated by our customers. Grab this limited edition product, only available on Etsy. Don't miss the chance to own a piece of the VarioTM-188 collection.\n\nSKU: VARIOTM-188-080169",
    "price": 19.99,
    "tags": [
      "VarioTM-188",
      "Quality Product",
      "Everyday Use",
      "Ideal Gift",
      "Unique Item",
      "Durable",
      "Value for Money",
      "Highly Rated",
      "Trendy Product",
      "Best Seller",
      "Limited Edition",
      "Must Have",
      "Etsy Special"
    ],
    "categories": [
      "Bestselling Items",
      "Unique Products"
    ],
    "quantity": 1,
    "sku": "VARIOTM-188-080169",
    "images": [
      "/home/xmk/etsy-automation/exports/images/VARIOTM-188-080169/lifestyle_DSC_1050.png",
      "/home/xmk/etsy-automation/exports/images/VARIOTM-188-080169/lifestyle_DSC_1067.png"
    ]
  },
  {
    "title": "Unique VarioTM-188 - Rare Collectible Item, Perfect Gift for Collectors - SKU VARIOTM-188-200641",
    "description": "Discover the unique charm of VarioTM-188, a rare and highly sought-after collectible item. This special edition product is perfect for collectors or those who appreciate the finer things in life. It's a high-quality, authentic piece from the Vario collection, showcasing exceptional craftsmanship. Our SKU VARIOTM-188-200641 is a unique find that adds a touch of vintage class to any setting. It makes a thoughtful and unique gift for collectors, or a special addition to your own collection. Don't miss out on owning a piece of Vario history with this rare, special edition item.\n\nSKU: VARIOTM-188-200641",
    "price": 19.99,
    "tags": [
      "VarioTM-188",
      "Collectible Item",
      "Unique Gift",
      "Gift for Collectors",
      "Rare Product",
      "Special Edition",
      "High Quality",
      "Authentic Vario",
      "Vario Collection",
      "Vintage Vario",
      "SKU VARIOTM-188",
      "Home Decor",
      "Antique Vario"
    ],
    "categories": [
      "Collectibles",
      "Home & Living"
    ],
    "quantity": 1,
    "sku": "VARIOTM-188-200641",
    "images": []
  },
  {
    "title": "VarioTM-188 Exclusive Product - Unique Gift, High Quality, Perfect for Every Occasion",
    "description": "Discover the VarioTM-188, a versatile and unique product designed with quality and style in mind. This exclusive item is the perfect choice for any occasion - whether it's a birthday, anniversary, or just to treat yourself. Made with high-quality materials, the VarioTM-188 is durable and long-lasting. The sophisticated design will complement any interior decor, making it an excellent addition to your home. This best-selling, top-rated product is a must-have for anyone looking for unique, stylish home accessories. With the VarioTM-188, you're not just buying a product - you're investing in a piece that will bring joy and add elegance to your life. Don't miss out on this exclusive offer. Order now and experience the VarioTM-188 difference!\n\nSKU: VARIOTM-188-256963",
    "price": 19.99,
    "tags": [
      "VarioTM-188",
      "exclusive product",
      "quality gift",
      "unique present",
      "home decor",
      "birthday gift",
      "anniversary present",
      "trending items",
      "best selling",
      "top rated",
      "home accessories",
      "gift for her",
      "gift for him"
    ],
    "categories": [
      "Home & Living",
      "Gifts & Specialty"
    ],
    "quantity": 1,
    "sku": "VARIOTM-188-256963",
    "images": []
  },
  {
    "title": "VarioTM-188 Handcrafted Product, Unique Home Decor, Perfect Gift Item, SKU: VARIOTM-188-693063",
    "description": "Introducing our exceptional VarioTM-188 - a unique, handcrafted product that beautifully blends functionality and aesthetic appeal. This exclusive item, SKU: VARIOTM-188-693063, makes a perfect addition to your home decor, adding a touch of elegance and charm to any space. Crafted with utmost care and precision, it showcases the true essence of skilled craftsmanship. The VarioTM-188 is not only a simple home decor item but also a perfect gift option for your loved ones, suitable for all occasions. This artistic creation is a must-have for those who value quality crafts and unique designs. Make this bestseller from Etsy a part of your collection or gift it to make someone's day special.\n\nSKU: VARIOTM-188-693063",
    "price": 19.99,
    "tags": [
      "Handmade Product",
      "VarioTM-188",
      "Home Decor",
      "Unique Gifts",
      "Quality Crafts",
      "Artistic Creation",
      "Etsy Unique",
      "Home Enhancement",
      "Personalized Item",
      "Perfect Gift",
      "Etsy Bestseller",
      "Handcrafted Decor",
      "SKU 693063"
    ],
    "categories": [
      "Handmade Products",
      "Home Decor"
    ],
    "quantity": 1,
    "sku": "VARIOTM-188-693063",
    "images": [
      "/home/xmk/etsy-automation/exports/images/VARIOTM-188-693063/processed_DSC_1029.png"
    ]
  }
];
    
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          const imagePath = product.images[i];
          if (await fs.pathExists(imagePath)) {
            const fileName = `${product.sku}_${i + 1}_${path.basename(imagePath)}`;
            archive.file(imagePath, { name: fileName });
            console.log(`📸 Eklendi: ${fileName}`);
          }
        }
      }
    }
    
    await archive.finalize();
  } catch (error) {
    console.error('❌ ZIP oluşturma hatası:', error.message);
  }
}

createImagesZip();