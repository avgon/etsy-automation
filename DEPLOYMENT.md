# 🚀 Railway Deployment Guide - AI-Enhanced Etsy Automation

## Quick Deploy

1. **Railway Login**
   ```bash
   railway login
   ```
   Browser'da login yapın.

2. **Deploy**
   ```bash
   railway up
   ```

3. **Environment Variables Set**
   Railway dashboard'da şu env variables ekleyin:

   ```env
   # Google Drive API (Required)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REFRESH_TOKEN=your_google_refresh_token
   GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id

   # OpenAI API (Required for AI processing)
   OPENAI_API_KEY=your_openai_api_key
   CUSTOM_GPT_ID=your_custom_gpt_id

   # AI Features (NEW)
   USE_INTELLIGENT_PROCESSING=true

   # Server Settings
   PORT=3000
   NODE_ENV=production
   SITE_PASSWORD=etsy2024secure

   # Processing Settings
   OUTPUT_IMAGE_SIZE=3000
   PROCESSING_INTERVAL=60000
   ADD_BACKGROUND=true
   BACKGROUND_TYPE=image
   REMOVE_BACKGROUND=true
   ```

## ✨ New AI Features

### 🧠 Intelligent Image Processing
- **GPT-4o Vision** automatically analyzes backgrounds and products
- **Smart Detection**: Distinguishes between necklaces, rings, bracelets
- **Chain Analysis**: Detects chain length and extends for full visibility
- **Dynamic Positioning**: Optimizes placement based on background style

### 📐 Product-Specific Algorithms
- **Necklaces**: Up to 140% canvas size for full chain display
- **Rings**: 70% size with precise centering for detail visibility
- **Bracelets**: Balanced sizing with wrist context awareness

### 🎨 Background Intelligence
- **Style Detection**: Identifies luxury, minimal, textured backgrounds
- **Color Analysis**: Matches product positioning to color schemes
- **Optimal Regions**: Places products in background's best areas
- **Compatibility Scoring**: Rates jewelry suitability per background

## 🔧 Testing Deployed System

1. **Access Web Interface**: `https://your-app.railway.app`

2. **Test AI Processing**:
   - Upload a necklace image → Should detect chain and extend vertically
   - Upload a ring image → Should center and optimize for detail
   - Check logs for "intelligent processing" vs "traditional processing"

3. **Monitor Performance**:
   ```bash
   railway logs
   ```

## 📊 Expected Behavior

### Necklace Processing:
```
[info]: Product analyzed successfully {
  "productType": "necklace",
  "hasChain": true,
  "chainLength": "long"
}
[info]: Optimal positioning calculated {
  "strategy": "chain_vertical_extend",
  "baseSizePercentage": "140.0%"
}
```

### Ring Processing:
```
[info]: Product analyzed successfully {
  "productType": "ring",
  "hasChain": false
}
[info]: Optimal positioning calculated {
  "strategy": "ring_centered", 
  "baseSizePercentage": "70.0%"
}
```

## 🛠️ Troubleshooting

### AI Processing Falls Back:
- Check OPENAI_API_KEY validity
- Monitor API rate limits
- Verify internet connectivity

### Traditional Processing:
- Set `USE_INTELLIGENT_PROCESSING=false` to disable AI
- System automatically falls back on AI errors

## 📱 Access URLs

- **Production**: `https://your-app.railway.app`
- **Login**: Use `SITE_PASSWORD` from environment
- **Processing**: Upload images and test AI detection

The system now intelligently processes jewelry with AI-powered analysis!