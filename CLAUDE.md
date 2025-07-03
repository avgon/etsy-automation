# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated Etsy listing tool that monitors Google Drive folders, processes product images with AI-generated lifestyle showcases, creates SEO content, and exports products for Etsy listing. The system uses a service-oriented architecture with distinct responsibilities for each major component.

## Core Architecture

The application follows a main orchestrator pattern (`EtsyAutomation` class) that coordinates multiple services:

- **GoogleDriveService**: Monitors folders, downloads/uploads files using OAuth2
- **OpenAIService**: Generates lifestyle showcases with GPT-4o and DALL-E-3, creates SEO content with custom GPT
- **ImageProcessor**: Uses Sharp for image manipulation, combines products with AI-generated backgrounds
- **EtsyService**: Handles API integration (currently disabled, uses CSV export instead)
- **CSVExportService**: Creates manual listing files when Etsy API is unavailable

The main workflow: Monitor → Download → AI Process → Combine Images → Generate SEO → Export

## Essential Commands

```bash
# Start the main automation (continuous monitoring)
npm start

# Development mode with auto-reload
npm run dev

# Test API connections
node test-connection.js

# Test SEO generation
node test-seo.js

# Process a specific folder manually
node process-single-folder.js

# Setup Google OAuth (one-time)
node oauth-setup.js
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- Google Drive API credentials (OAuth2 + refresh token)
- OpenAI API key and custom GPT ID
- Processing settings (image size, intervals)
- Etsy API settings (currently unused, exports to CSV instead)

The system requires Google Drive API setup with OAuth2 for folder monitoring and file operations.

## Key Processing Flow

1. **Monitoring**: Polls Google Drive folder every 60 seconds for new subfolders
2. **SKU Generation**: Creates unique SKUs from folder names with timestamps
3. **Image Processing**: Downloads → AI Showcase → Combine → Resize to 3000x3000
4. **Lifestyle Showcase**: Uses GPT-4o to analyze product, DALL-E-3 to generate professional model scenes
5. **SEO Generation**: Custom GPT creates Etsy-optimized titles, tags, descriptions
6. **Export**: Saves to `exports/` with CSV, images, and manual listing guides

## Image Processing Details

The system creates "lifestyle showcases" rather than simple backgrounds:
- Analyzes product with GPT-4o vision
- Generates professional model/fashion shoot scenes with DALL-E-3
- Positions original product strategically on the showcase (30% size, right side)
- Enhances product brightness/saturation for visibility
- Outputs 3000x3000 JPEG files

## Output Structure

- `exports/etsy-products.csv`: Bulk product data
- `exports/images/{SKU}/`: Processed lifestyle images  
- `exports/listing-guide-{SKU}.md`: Manual listing instructions
- `exports/product-{SKU}.json`: Detailed product metadata

## Debugging & Testing

Use `test-connection.js` to verify API connectivity before running main automation. The `process-single-folder.js` script allows reprocessing specific folders for testing changes. All operations are logged to `logs/` directory with structured JSON logging via Winston.

## Rate Limiting Considerations

The system handles OpenAI DALL-E rate limits with 429 error handling. Google Drive API calls are spaced appropriately. Processing intervals can be adjusted via `PROCESSING_INTERVAL` environment variable.