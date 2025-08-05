const OneClickListerAPI = require('./src/services/oneClickListerAPI');
const logger = require('./src/utils/logger');

class StoreSelector {
  constructor() {
    this.oclAPI = new OneClickListerAPI();
  }

  /**
   * Interactive store selection
   * @returns {Object} - Selected store information
   */
  async selectStore() {
    try {
      console.log('🏪 OneClickLister Store Selection\n');

      // Fetch available stores
      console.log('📡 Fetching connected stores...');
      const stores = await this.oclAPI.listStoresForSelection();

      if (stores.length === 0) {
        console.log('❌ No stores found. Please connect a store in OneClickLister dashboard first.');
        return null;
      }

      console.log(`✅ Found ${stores.length} connected store(s):\n`);

      // Display store options
      stores.forEach(store => {
        const activeIndicator = store.isActive ? '👈 ACTIVE' : '';
        const statusEmoji = store.status === 'active' ? '🟢' : '🔴';
        const platformEmoji = store.platform === 'etsy' ? '🎨' : '🛍️';
        
        console.log(`${store.index}. ${platformEmoji} ${store.storeName}`);
        console.log(`   Store ID: ${store.storeId}`);
        console.log(`   Platform: ${store.platform.toUpperCase()}`);
        console.log(`   Status: ${statusEmoji} ${store.status} ${activeIndicator}`);
        console.log('');
      });

      return stores;
    } catch (error) {
      console.error('❌ Error fetching stores:', error.message);
      logger.error('Store selection error', { error: error.message });
      return null;
    }
  }

  /**
   * Set active store by index or ID
   * @param {string|number} identifier - Store index (1-based) or store ID
   * @returns {Object} - Active store info
   */
  async setActiveStore(identifier) {
    try {
      const stores = await this.oclAPI.listStoresForSelection();
      
      if (!stores || stores.length === 0) {
        throw new Error('No stores available');
      }

      let selectedStore = null;

      // Check if identifier is an index (1-based)
      if (Number.isInteger(Number(identifier)) && Number(identifier) >= 1 && Number(identifier) <= stores.length) {
        selectedStore = stores[Number(identifier) - 1];
      } else {
        // Look for store by ID
        selectedStore = stores.find(store => 
          store.storeId == identifier || store.storeName.toLowerCase().includes(String(identifier).toLowerCase())
        );
      }

      if (!selectedStore) {
        throw new Error(`Store not found: ${identifier}`);
      }

      // Set as active store
      const activeStore = await this.oclAPI.setActiveStore(selectedStore.storeId);
      
      console.log('✅ Active store set:');
      console.log(`   📍 Store: ${selectedStore.storeName}`);
      console.log(`   🆔 ID: ${selectedStore.storeId}`);
      console.log(`   🏷️ Platform: ${selectedStore.platform.toUpperCase()}`);
      console.log(`   📊 Status: ${selectedStore.status}`);

      return activeStore;
    } catch (error) {
      console.error('❌ Error setting active store:', error.message);
      throw error;
    }
  }

  /**
   * Get current active store
   * @returns {Object} - Active store info
   */
  async getCurrentStore() {
    try {
      const stores = await this.oclAPI.listStoresForSelection();
      const activeStore = stores.find(store => store.isActive);

      if (!activeStore) {
        console.log('⚠️ No active store set');
        return null;
      }

      console.log('🎯 Current Active Store:');
      console.log(`   📍 Store: ${activeStore.storeName}`);
      console.log(`   🆔 ID: ${activeStore.storeId}`);
      console.log(`   🏷️ Platform: ${activeStore.platform.toUpperCase()}`);
      console.log(`   📊 Status: ${activeStore.status}`);

      return activeStore;
    } catch (error) {
      console.error('❌ Error getting current store:', error.message);
      return null;
    }
  }

  /**
   * Create product with store selection
   * @param {Object} productPayload - Product data
   * @param {string|number} storeIdentifier - Optional store identifier
   * @returns {Object} - Creation result
   */
  async createProductWithStore(productPayload, storeIdentifier = null) {
    try {
      let targetStoreId = null;

      if (storeIdentifier) {
        // Set specific store for this operation
        const selectedStore = await this.setActiveStore(storeIdentifier);
        targetStoreId = selectedStore.id || selectedStore.store_id;
      } else {
        // Use current active store
        const currentStore = await this.getCurrentStore();
        if (!currentStore) {
          console.log('📋 Please select a store first:');
          await this.selectStore();
          return null;
        }
        targetStoreId = currentStore.storeId;
      }

      console.log(`\n🚀 Creating product in store: ${targetStoreId}`);
      console.log(`📦 Product: ${productPayload.product.title}`);

      const result = await this.oclAPI.createProduct(productPayload, targetStoreId);
      
      console.log('✅ Product created successfully!');
      console.log(`🆔 Product ID: ${result.productId || result.id}`);

      return result;
    } catch (error) {
      console.error('❌ Error creating product with store:', error.message);
      throw error;
    }
  }

  /**
   * Show store selection help
   */
  showHelp() {
    console.log(`
🏪 OneClickLister Store Management Help

📋 Available Commands:
   node store-selector.js list              # List all connected stores
   node store-selector.js current           # Show current active store
   node store-selector.js set <id>          # Set active store by ID or index
   
💡 Usage Examples:
   node store-selector.js set 1             # Set first store as active
   node store-selector.js set 12345         # Set store with ID 12345 as active
   node store-selector.js set "MyStore"     # Set store by name (partial match)

🔗 Integration Examples:
   const selector = new StoreSelector();
   await selector.setActiveStore(1);        // Set first store
   const stores = await selector.selectStore(); # List stores
   
⚠️ Note: You must authenticate with OneClickLister first before using store selection.
`);
  }
}

// CLI Interface
async function main() {
  const selector = new StoreSelector();
  const command = process.argv[2];
  const argument = process.argv[3];

  switch (command) {
    case 'list':
      await selector.selectStore();
      break;
      
    case 'current':
      await selector.getCurrentStore();
      break;
      
    case 'set':
      if (!argument) {
        console.log('❌ Please provide store ID or index');
        console.log('Usage: node store-selector.js set <id>');
        return;
      }
      await selector.setActiveStore(argument);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      selector.showHelp();
      break;
      
    default:
      console.log('🏪 OneClickLister Store Selector\n');
      selector.showHelp();
      break;
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

module.exports = StoreSelector;