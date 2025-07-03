const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const EtsyAutomation = require('./src/index');
const GoogleDriveService = require('./src/services/googleDrive');
const ImageProcessor = require('./src/services/imageProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/exports', express.static('exports'));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Initialize services
const googleDrive = new GoogleDriveService();
const imageProcessor = new ImageProcessor();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/folders', async (req, res) => {
  try {
    const folders = await googleDrive.pollForNewFolders();
    res.json({ success: true, folders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/process-folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // Start processing (non-blocking)
    const automation = new EtsyAutomation();
    const folders = await googleDrive.pollForNewFolders();
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    
    // Process in background
    automation.processFolder(folder).then(() => {
      console.log(`Folder ${folder.name} processed successfully`);
    }).catch(error => {
      console.error(`Error processing folder ${folder.name}:`, error);
    });
    
    res.json({ 
      success: true, 
      message: `Processing started for folder: ${folder.name}`,
      folderId,
      folderName: folder.name
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/exports', async (req, res) => {
  try {
    const exportsDir = path.join(__dirname, 'exports');
    const files = await fs.readdir(exportsDir);
    
    const exports = {
      csv: files.filter(f => f.endsWith('.csv')),
      guides: files.filter(f => f.startsWith('listing-guide-')),
      products: files.filter(f => f.startsWith('product-')),
      images: []
    };
    
    // Check images folder
    const imagesDir = path.join(exportsDir, 'images');
    if (await fs.pathExists(imagesDir)) {
      const imageFolders = await fs.readdir(imagesDir);
      exports.images = imageFolders;
    }
    
    res.json({ success: true, exports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/export/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'exports', filename);
    
    if (await fs.pathExists(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ success: false, error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload-backgrounds', upload.array('backgrounds'), async (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    await fs.ensureDir(backgroundsDir);
    
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const newPath = path.join(backgroundsDir, file.originalname);
      await fs.move(file.path, newPath);
      uploadedFiles.push(file.originalname);
    }
    
    res.json({ 
      success: true, 
      message: `${uploadedFiles.length} background files uploaded`,
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backgrounds', async (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    const files = await fs.readdir(backgroundsDir);
    const backgrounds = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
    
    res.json({ success: true, backgrounds });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Etsy Automation Web Interface running on port ${PORT}`);
  console.log(`📱 Access at: http://localhost:${PORT}`);
});

module.exports = app;