# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated Etsy listing tool that monitors Google Drive folders, processes product images with professional backgrounds, creates SEO content, and exports products for Etsy listing. The system offers both automated monitoring and a web interface for manual processing, with a service-oriented architecture.

## Core Architecture

The application has **two main entry points**:

### Command Line Interface (`src/index.js`)
- Automated monitoring and processing engine
- Polls Google Drive every 60 seconds for new product folders
- Processes products end-to-end without user intervention

### Web Interface (`server.js`) 
- Express.js server with multi-user authentication
- Manual folder processing and configuration management
- User-specific API token management with SQLite database

### Service Layer (`src/services/`)
- **GoogleDriveService**: OAuth2-based folder monitoring, file downloads/uploads
- **OpenAIService**: GPT-4o SEO content generation with custom GPT fallbacks
- **ImageProcessor**: Professional background application using Sharp (not AI-generated backgrounds)
- **EtsyService**: Direct API integration (configured but defaults to CSV export)
- **CSVExportService**: Etsy-compatible CSV and manual listing guide generation
- **EtsyBulkUploadService**: Bulk upload CSV formatting and image packaging

The main workflow: Monitor → Download → Background Processing → SEO Generation → Export

## Essential Commands

```bash
# Start the main automation (continuous monitoring)
npm start

# Start web interface server on port 3000
npm run web
# Alternative: npm run dev-web (with auto-restart)

# Test API connections before running automation
node test-connection.js

# Process a specific folder manually for testing
node process-single-folder.js

# Setup Google OAuth (one-time configuration)
node oauth-setup.js

# Create bulk upload files from processed products
node create-bulk-upload.js

# Create image ZIP packages for Etsy upload
node create-images-zip.js

# Test background processing functionality
node test-background.js

# Full end-to-end workflow testing
node full-process-test.js

# Run tests
npm test

# Development mode with auto-restart
npm run dev
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- **Google Drive API**: Client credentials, refresh token, folder IDs for monitoring
- **OpenAI API**: API key and custom GPT model ID for SEO content generation
- **Processing Settings**: Image size (default 3000x3000), monitoring intervals
- **Etsy API**: Shop credentials (configured but defaults to CSV export)
- **Site Authentication**: Password for web interface access

The system requires Google Drive API setup with OAuth2 for folder monitoring and file operations. Web interface users manage their own API tokens through the database.

## Key Processing Flow

1. **Monitoring**: Polls Google Drive folder every 60 seconds for new subfolders
2. **SKU Generation**: Creates unique SKUs from folder names with timestamps
3. **Image Processing**: Downloads → Background Application → Resize to 3000x3000
4. **Product Type Detection**: Automatically detects rings vs necklaces for optimal positioning
5. **Background Processing**: Applies professional backgrounds (Back1.jpg, Back2.jpg, Back3.jpg) from `test-backgrounds/`
   - **Rings**: 75% canvas area, center positioning
   - **Necklaces**: 150% canvas area (2x larger), upper-center positioning (15% from top)
6. **SEO Generation**: Custom "Killer SEO GPT" creates 130-140 char titles, 13 tags (preserving spaces), optimized descriptions
7. **Export**: Saves to `exports/` with CSV, images, and manual listing guides
8. **Etsy Integration**: Optional automatic listing via Etsy API or CSV export for manual upload
9. **Upload**: Stores processed files back to Google Drive "processed" folder

## Image Processing Details

The system applies professional backgrounds rather than generating AI showcases:
- Downloads product images from Google Drive folders
- Removes original backgrounds using Sharp image processing
- Applies one of three professional backgrounds (Back1.jpg, Back2.jpg, Back3.jpg)
- Products are sized to 70-75% of canvas area for optimal visibility
- Positions products centrally with professional lighting effects
- Outputs 3000x3000 JPEG files at 95% quality

## Output Structure

```
exports/
├── etsy-products.csv          # Main product export for bulk operations
├── etsy-bulk-upload.csv       # Etsy-formatted bulk upload file
├── etsy-images.zip           # Packaged images for Etsy upload
├── images/                   # Processed images organized by SKU
│   └── {SKU}/               # Individual product image folders
├── listing-guide-{SKU}.md    # Manual listing instructions per product
└── product-{SKU}.json       # Detailed product metadata and SEO content
```

## Database and Authentication

- **SQLite database**: `data/users.db` stores user accounts and API tokens
- **Multi-user support**: Each user manages their own Google Drive and OpenAI tokens
- **Session management**: JWT-based authentication for web interface
- **Site protection**: Password-protected access to the application

## Debugging & Testing

Use `test-connection.js` to verify API connectivity before running main automation. The `process-single-folder.js` script allows reprocessing specific folders for testing changes. All operations are logged to `logs/` directory with structured JSON logging via Winston.

## Rate Limiting Considerations

The system handles OpenAI API rate limits with 429 error handling. Google Drive API calls are spaced appropriately. Processing intervals can be adjusted via `PROCESSING_INTERVAL` environment variable.

## Background Image Configuration

The system uses three professional background images stored in `test-backgrounds/`:
- `Back1.jpg`, `Back2.jpg`, `Back3.jpg` - Applied to all products
- Products are automatically sized to 70-75% of canvas area for optimal visibility
- Background selection and product positioning handled automatically by ImageProcessor service

## Key Scripts and Their Functions

- **`analyze-etsy-sample.js`**: Analyzes sample Excel files to understand product structure
- **`correct-full-process.js`**: Main corrected processing workflow
- **`process-original-product.js`**: Processes original product images without backgrounds
- **`test-custom-background.js`**: Tests custom background application
- **`test-photoroom-style.js`**: Tests PhotoRoom-style background processing
- **`test-seo.js`**: Tests SEO content generation functionality
- **`test-your-backgrounds.js`**: Tests user-uploaded background images

## Testing and Validation

Before running production automation, always:
1. Run `node test-connection.js` to verify API connectivity
2. Test with a single folder using `node process-single-folder.js`
3. Check logs in `logs/` directory for any errors
4. Verify exports in `exports/` directory

## Troubleshooting

- **Google Drive API Quota**: Monitor usage and implement delays if needed
- **OpenAI Rate Limits**: System handles 429 errors automatically with retries
- **Image Processing**: Check Sharp library compatibility and temp directory permissions
- **Database Issues**: SQLite database stored in `data/users.db`