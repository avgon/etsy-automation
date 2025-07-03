const EtsyAutomation = require('./src/index');

class SingleFolderProcessor extends EtsyAutomation {
  constructor() {
    super();
    // Force reprocessing by clearing the processed folders set
    this.processedFolders.clear();
  }

  async processSingleFolder(folderId) {
    try {
      console.log('🔄 Tekli klasör işleme başlatılıyor...');
      
      // Initialize system
      await this.initialize();
      
      // Get folder info
      const folders = await this.googleDrive.getSubfolders(this.googleDrive.config?.google?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID);
      const targetFolder = folders.find(f => f.id === folderId);
      
      if (!targetFolder) {
        console.log('❌ Klasör bulunamadı:', folderId);
        return;
      }
      
      console.log(`📁 Klasör bulundu: ${targetFolder.name} (${targetFolder.id})`);
      
      // Process the folder
      await this.processFolder(targetFolder);
      
      console.log('✅ İşlem tamamlandı!');
      console.log('📁 Exports klasörünü kontrol edin:');
      console.log('   - exports/images/ -> İşlenmiş görseller');
      console.log('   - exports/etsy-products.csv -> Ürün bilgileri');
      console.log('   - exports/listing-guide-*.md -> Listeleme rehberi');
      
    } catch (error) {
      console.error('❌ Hata:', error.message);
    }
  }
}

// VarioTM-188 klasörünü yeniden işle
const processor = new SingleFolderProcessor();
processor.processSingleFolder('14r73hRX_RHlyxJY1XIRuOE3AeGCPlMue')
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });