# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Application
```bash
npm start           # Start automated monitoring (CLI mode)
npm run web        # Start web interface on port 3000
npm run dev        # Development mode with auto-restart (CLI)
npm run dev-web    # Web interface with auto-restart
npm test           # Run Jest tests
```

### Testing & Validation
```bash
node test-connection.js         # Test API connectivity
node full-process-test.js       # End-to-end workflow testing
node process-single-folder.js   # Manual single folder processing
node test-background.js         # Test background processing
node test-seo.js               # Test SEO content generation
node test-oneclicklister.js     # Test OneClickLister payload integration
node test-etsy-v3.js           # Test Etsy API v3 integration
node test-oneclicklister-api.js # Test OneClickLister API integration
node test-product-positioning.js # Test product positioning system
node store-selector.js list      # List OneClickLister stores
node store-selector.js set 1     # Set active store
```

### Setup & Utilities
```bash
node oauth-setup.js            # Google OAuth setup
node etsy-oauth-setup.js       # Etsy OAuth 2.0 setup with PKCE
node create-bulk-upload.js     # Generate bulk upload files
node create-images-zip.js      # Create image ZIP packages
```

## Architecture Overview

### Dual Entry Points
- **CLI Mode** (`src/index.js`): Automated Google Drive monitoring with 60-second intervals
- **Web Mode** (`server.js`): Multi-user web interface with JWT authentication

### Service Layer (`src/services/`)
- **GoogleDriveService**: OAuth2 folder monitoring, file operations
- **OpenAIService**: GPT-4o SEO content generation with custom GPT integration
- **ImageProcessor**: Professional background application using Sharp
- **EtsyService**: Etsy API v3 integration with OAuth 2.0 and PKCE
- **EtsyOAuthService**: Complete OAuth 2.0 flow with token management
- **EtsyOneClickListerService**: OneClickLister payload format integration
- **OneClickListerAPI**: Full OneClickLister API integration
- **EtsyBulkUploadService**: CSV export for manual Etsy bulk uploads
- **CSVExportService**: Etsy-compatible product data export

### Database Layer (`src/database/`)
- **Auto-detecting factory**: SQLite (default) or PostgreSQL (when DATABASE_URL set)
- **Multi-user support**: User accounts with individual API token management
- **Schema**: Users table with linked user_tokens for API credentials

### Authentication System
- **JWT tokens** for web interface sessions
- **Site-wide password protection** via SITE_PASSWORD environment variable
- **User-specific API tokens** stored securely in database

## Processing Flow

### Automated Monitoring (CLI)
1. Monitor Google Drive folder every 60 seconds
2. Detect new folders → Download images
3. Apply professional backgrounds from `test-backgrounds/`
4. Generate SEO content using Custom GPT
5. Export CSV/JSON formats
6. Upload processed files back to Google Drive

### Web Interface Flow
1. User login → Token configuration
2. Manual folder selection → Real-time processing
3. Export downloads (CSV, ZIP, JSON)

## Key Configuration

### Required Environment Variables
```bash
# Google Drive API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=

# OpenAI API
OPENAI_API_KEY=
CUSTOM_GPT_ID=

# Etsy API v3 (OAuth 2.0)
ETSY_API_KEY=
ETSY_API_SECRET=
ETSY_ACCESS_TOKEN=
ETSY_REFRESH_TOKEN=
ETSY_SHOP_ID=
ETSY_CLIENT_ID=
ETSY_REDIRECT_URI=http://localhost:3000/auth/etsy/callback

# OneClickLister API
ONECLICKLISTER_API_KEY=
ONECLICKLISTER_USER_CODE=
ONECLICKLISTER_STORE_ID=
ONECLICKLISTER_API_URL=https://api.oneclicklister.com
USE_ONECLICKLISTER=false

# Processing Settings
OUTPUT_IMAGE_SIZE=3000
PROCESSING_INTERVAL=60000
ADD_BACKGROUND=true
BACKGROUND_TYPE=image
REMOVE_BACKGROUND=true

# Authentication
SITE_PASSWORD=
SESSION_SECRET=
```

### Database Configuration
- **SQLite**: Default, stores in `data/users.db`
- **PostgreSQL**: Set `DATABASE_URL` for production

## Image Processing Pipeline

### Background Application
- Uses professional backgrounds from `test-backgrounds/` (Back1.jpg, Back2.jpg, Back3.jpg)
- Automatic product detection for optimal positioning
- Outputs 3000x3000 JPEG files at 90% quality
- Fallback to 2000x2000 if processing fails

### SEO Content Generation
- Custom GPT integration for optimized Etsy content
- Title generation: 130-140 characters
- Tag generation: 13 tags preserving spaces
- Rich product descriptions with keywords

## Export Structure

```
exports/
├── etsy-products.csv          # Main product export
├── etsy-bulk-upload.csv       # Etsy bulk upload format
├── etsy-images.zip           # Image packages
├── images/{SKU}/             # Processed images by SKU
├── listing-guide-{SKU}.md    # Manual listing instructions
└── product-{SKU}.json       # Product metadata
```

## Logging System

- **Winston logger** with structured JSON output
- **File outputs**: `logs/error.log`, `logs/combined.log`
- **Service-specific logging** across all components
- **Console output** in development mode

## Development Workflow

1. **Initial Setup**: Copy `.env.example` to `.env` and configure API keys
2. **API Testing**: Run `node test-connection.js` to verify connectivity
3. **Single Folder Testing**: Use `node process-single-folder.js` for isolated testing
4. **OneClickLister Testing**: Run `node test-oneclicklister.js` to test payload integration
5. **Development**: Use `npm run dev` (CLI) or `npm run dev-web` (web interface)

## OneClickLister Integration

### EtsyOneClickListerService Features
- **Payload Transformation**: Converts OneClickLister format to Etsy API format
- **Advanced Image Management**: Supports image positioning, alt text, and URL uploads
- **Variant Support**: Handles product variants with properties and pricing
- **Dimensions & Weight**: Full support for product specifications
- **Material Extraction**: Auto-extracts materials from product attributes
- **Taxonomy Mapping**: Intelligent category mapping for Etsy taxonomy
- **Validation System**: Comprehensive payload validation with error reporting

### OneClickLister Payload Support
```javascript
{
  "product": {
    "title": "string",
    "description": "string", 
    "price": { "amount": "number", "currency": "string" },
    "sku": "string",
    "quantity": "number",
    "tags": ["array"],
    "attributes": [{ "name": "string", "value": "any" }],
    "dimensions": { "height": "string", "length": "string", "width": "string", "unit": "string" },
    "weight": { "amount": "string", "unit": "string" },
    "images": [{ "url": "string", "position": "number", "altText": "string", "newImage": "boolean" }],
    "variants": [{ "sku": "string", "price": {}, "quantity": "number", "properties": [] }]
  },
  "storeId": "number",
  "userCode": "string"
}
```

### Usage Examples
```javascript
const EtsyOneClickListerService = require('./src/services/etsyOneClickLister');
const etsyService = new EtsyOneClickListerService();

// Validate payload
const validation = etsyService.validatePayload(oneClickPayload);

// Create listing from OneClickLister payload
const result = await etsyService.createListingFromPayload(oneClickPayload);
```

## Etsy API v3 Integration

### New OAuth 2.0 Features
- **PKCE Support**: Secure OAuth flow with Proof Key for Code Exchange
- **Automatic Token Refresh**: Background token validation and refresh
- **Complete Scope Management**: All required permissions for full functionality
- **Shipping/Fulfillment**: Order tracking and carrier integration

### OAuth 2.0 Setup Process
```bash
# 1. Set up API credentials
node etsy-oauth-setup.js

# 2. Follow browser OAuth flow
# 3. Copy tokens to .env file
# 4. Test connection
node test-etsy-v3.js
```

### Supported Etsy API v3 Features
- **Listing Management**: Create, update, delete listings
- **Image Upload**: Multi-image support with alt text
- **Order Management**: Receipt access and fulfillment
- **Shipping Integration**: 25+ supported carriers
- **Shop Management**: Templates, sections, taxonomy
- **Token Management**: Automatic refresh and validation

### OneClickLister API Integration

### Complete API Integration
```javascript
const OneClickListerAPI = require('./src/services/oneClickListerAPI');
const oclAPI = new OneClickListerAPI();

// Convert Etsy product to OneClickLister format
const oclPayload = oclAPI.convertEtsyProductToOCL(etsyProduct, imagePaths);

// Create single product
const result = await oclAPI.createProduct(oclPayload);

// Bulk operations
const bulkResult = await oclAPI.createProductsBulk([payload1, payload2, payload3]);

// Store management
const store = await oclAPI.fetchStore();
const listings = await oclAPI.fetchListings();

// Etsy-specific features
const categories = await oclAPI.getEtsyCategories();
const shipping = await oclAPI.getShippingProfiles();
```

### Supported OneClickLister Features
- **Product Creation**: Single and bulk product creation
- **Product Updates**: Individual and bulk updates
- **Store Management**: Store sync and information
- **Etsy Integration**: Categories, shipping profiles, taxonomy
- **Job Management**: Background job tracking
- **Scheduling**: Automated product scheduling
- **Format Conversion**: Automatic Etsy-to-OneClickLister conversion
- **Store Management**: Multi-store support with automatic selection

## Store Management System

### Multi-Store Support
OneClickLister supports multiple connected stores (Etsy, Shopify). Your automation needs to know which store to target.

### Store Selection Methods

#### 1. Interactive Store Selection
```bash
node store-selector.js list      # List all connected stores
node store-selector.js current   # Show current active store
node store-selector.js set 1     # Set first store as active
node store-selector.js set 12345 # Set store by ID
```

#### 2. Programmatic Store Management
```javascript
const StoreSelector = require('./store-selector');
const selector = new StoreSelector();

// List all stores
const stores = await selector.selectStore();

// Set active store
await selector.setActiveStore(1); // By index
await selector.setActiveStore('12345'); // By ID
await selector.setActiveStore('MyStore'); // By name

// Create product in specific store
await selector.createProductWithStore(productPayload, storeId);
```

#### 3. Environment Variable Default
```env
ONECLICKLISTER_DEFAULT_STORE=your_default_store_id
```

### Store Selection Workflow
1. **First Time Setup**: Run `node store-selector.js list` to see available stores
2. **Set Default**: Use `node store-selector.js set <id>` to set active store
3. **Product Creation**: Products will automatically go to the active store
4. **Multi-Store**: Override per operation with `targetStoreId` parameter

### Store Information Display
```
🏪 OneClickLister Store Selection

✅ Found 2 connected store(s):

1. 🎨 My Etsy Shop
   Store ID: 12345
   Platform: ETSY
   Status: 🟢 active 👈 ACTIVE

2. 🛍️ My Shopify Store
   Store ID: 67890
   Platform: SHOPIFY  
   Status: 🟢 active
```

## Advanced Product Positioning System

### Reference Point Positioning
- **Blue X Reference Point**: Products align to consistent (35%, 30%) position
- **Product-Specific Alignment**: 
  - **Necklaces**: Pendant/main element centered at reference point
  - **Rings**: Stone/center detail aligned with reference point
- **Multi-language Support**: Turkish and English product detection
- **Automatic Boundary Validation**: Products stay within canvas bounds

### Positioning Features
```javascript
// Consistent positioning across all backgrounds
const position = imageProcessor.getReferencePointPosition(productType, productSize, canvasSize);

// Reference coordinates (3000x3000 canvas)
// Blue X at: (1050px, 900px) - 35% from left, 30% from top
```

### Supported Product Types
- **Necklace/Kolye**: Pendant-focused positioning
- **Ring/Yüzük**: Center-stone alignment
- **Auto-detection**: Filename and path analysis
- **Edge Cases**: Automatic adjustment for extreme sizes

### Test Results
- **Positioning Accuracy**: PERFECT (±0px deviation)
- **Boundary Safety**: 100% within canvas bounds
- **Product Detection**: Multi-language filename recognition
- **Edge Case Handling**: Large/small/extreme aspect ratios supported

## Deployment Options

- **Docker Compose**: Full containerized deployment
- **Railway**: Cloud platform deployment with `railway.dockerfile`
- **Production**: Environment variable configuration with PostgreSQL

## Security Considerations

- All sensitive data in environment variables
- JWT authentication with secure session management
- bcrypt password hashing for user accounts
- Input validation using express-validator