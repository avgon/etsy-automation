const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const createDatabase = require('./src/database');
const { requireAuth, requireTokens, generateToken, optionalAuth } = require('./src/middleware/auth');
const { requireSiteAuth } = require('./src/middleware/siteAuth');
const EtsyAutomation = require('./src/index');
const UserAutomation = require('./src/userAutomation');
const GoogleDriveService = require('./src/services/googleDrive');
const ImageProcessor = require('./src/services/imageProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Site-wide password protection
app.use(requireSiteAuth);

app.use(express.static('public'));
app.use('/exports', express.static('exports'));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Initialize database
const db = createDatabase();

// Initialize services (will be created per user)
let globalServices = {
  googleDrive: null,
  imageProcessor: new ImageProcessor()
};

// Create user-specific services
function createUserServices(userTokens) {
  const googleDrive = new GoogleDriveService();
  // Override with user tokens
  if (userTokens) {
    process.env.GOOGLE_CLIENT_ID = userTokens.google_client_id;
    process.env.GOOGLE_CLIENT_SECRET = userTokens.google_client_secret;
    process.env.GOOGLE_REFRESH_TOKEN = userTokens.google_refresh_token;
    process.env.GOOGLE_DRIVE_FOLDER_ID = userTokens.google_drive_folder_id;
    process.env.OPENAI_API_KEY = userTokens.openai_api_key;
    process.env.CUSTOM_GPT_ID = userTokens.custom_gpt_id;
  }
  return { googleDrive, imageProcessor: globalServices.imageProcessor };
}

// Site Authentication Routes
app.get('/site-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'site-login.html'));
});

app.post('/api/site-auth/login', (req, res) => {
  const { password } = req.body;
  const sitePassword = process.env.SITE_PASSWORD || 'etsy2024';
  
  if (password === sitePassword) {
    req.session.sitePassword = password;
    res.cookie('sitePassword', password, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid site password' });
  }
});

// Authentication API Routes
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const { email, password, name } = req.body;
    
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const userId = await db.createUser(email, password, name);
    const token = generateToken(userId);
    
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, token, user: { id: userId, email, name } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const { email, password } = req.body;
    
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await db.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/tokens', requireAuth, async (req, res) => {
  try {
    const tokens = req.body;
    await db.saveUserTokens(req.user.id, tokens);
    res.json({ success: true });
  } catch (error) {
    console.error('Save tokens error:', error);
    res.status(500).json({ error: 'Failed to save tokens' });
  }
});

app.get('/api/auth/tokens', requireAuth, async (req, res) => {
  try {
    const tokens = await db.getUserTokens(req.user.id);
    if (tokens) {
      const safeTokens = { ...tokens };
      delete safeTokens.id;
      delete safeTokens.user_id;
      delete safeTokens.created_at;
      delete safeTokens.updated_at;
      res.json(safeTokens);
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: 'Failed to get tokens' });
  }
});

// Routes
app.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login.html');
  }
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/setup-tokens', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'setup-tokens.html'));
});

app.get('/setup-guide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'setup-guide.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
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

app.get('/api/folders', requireAuth, requireTokens, async (req, res) => {
  try {
    const userServices = createUserServices(req.userTokens);
    const folders = await userServices.googleDrive.pollForNewFolders();
    res.json({ success: true, folders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/process-folder/:folderId', requireAuth, requireTokens, async (req, res) => {
  try {
    console.log('🔍 Process folder request:', req.params.folderId);
    console.log('🔍 User ID:', req.userId);
    console.log('🔍 User tokens exist:', !!req.userTokens);
    
    const { folderId } = req.params;
    
    // Start processing with user's tokens
    const userServices = createUserServices(req.userTokens);
    const automation = new UserAutomation(req.userTokens);
    
    console.log('🔍 Getting folders from Google Drive...');
    const folders = await userServices.googleDrive.pollForNewFolders();
    console.log('🔍 Found folders:', folders.length);
    
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      console.log('❌ Folder not found:', folderId);
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    
    console.log('✅ Found folder:', folder.name);
    
    // Process in background with user tokens
    automation.processFolder(folder).then(() => {
      console.log(`✅ Folder ${folder.name} processed successfully`);
    }).catch(error => {
      console.error(`❌ Error processing folder ${folder.name}:`, error);
    });
    
    res.json({ 
      success: true, 
      message: `Processing started for folder: ${folder.name}`,
      folderId,
      folderName: folder.name
    });
  } catch (error) {
    console.error('❌ Process folder error:', error);
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

// New endpoint for opening image folders
app.get('/api/export/images/:folderName', async (req, res) => {
  try {
    const { folderName } = req.params;
    const folderPath = path.join(__dirname, 'exports', 'images', folderName);
    
    if (await fs.pathExists(folderPath)) {
      const files = await fs.readdir(folderPath);
      const imageFiles = files.filter(file => 
        file.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i)
      );
      
      // Generate HTML page to display images
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Image Folder: ${folderName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .image-item { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .image-item img { width: 100%; height: 250px; object-fit: cover; border-radius: 4px; }
            .filename { margin-top: 10px; font-size: 14px; color: #666; word-break: break-all; }
            .download-btn { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; }
            .download-btn:hover { background: #45a049; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📁 Image Folder: ${folderName}</h1>
              <p>📸 Found ${imageFiles.length} images</p>
            </div>
            <div class="grid">
              ${imageFiles.map(file => `
                <div class="image-item">
                  <img src="/api/export/images/${folderName}/${file}" alt="${file}">
                  <div class="filename">${file}</div>
                  <a href="/api/export/images/${folderName}/${file}" download class="download-btn">📥 Download</a>
                </div>
              `).join('')}
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } else {
      res.status(404).json({ success: false, error: 'Folder not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Individual image file serving
app.get('/api/export/images/:folderName/:filename', async (req, res) => {
  try {
    const { folderName, filename } = req.params;
    const filePath = path.join(__dirname, 'exports', 'images', folderName, filename);
    
    if (await fs.pathExists(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, error: 'Image not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload-backgrounds', upload.array('backgrounds'), async (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    await fs.ensureDir(backgroundsDir);
    
    const { replace } = req.body;
    const uploadedFiles = [];
    const replacedFiles = [];
    
    for (const file of req.files) {
      const newPath = path.join(backgroundsDir, file.originalname);
      
      // Check if file exists and handle replace logic
      const fileExists = await fs.pathExists(newPath);
      if (fileExists && replace === 'true') {
        await fs.remove(newPath);
        replacedFiles.push(file.originalname);
      } else if (fileExists && replace !== 'true') {
        // Skip file if it exists and replace is not enabled
        await fs.remove(file.path); // Clean up temp file
        continue;
      }
      
      await fs.move(file.path, newPath);
      uploadedFiles.push(file.originalname);
    }
    
    res.json({ 
      success: true, 
      message: `${uploadedFiles.length} background files uploaded${replacedFiles.length > 0 ? `, ${replacedFiles.length} files replaced` : ''}`,
      files: uploadedFiles,
      replaced: replacedFiles
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete specific background files
app.delete('/api/backgrounds', async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ success: false, error: 'Files array is required' });
    }
    
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    const deletedFiles = [];
    const notFoundFiles = [];
    
    for (const filename of files) {
      const filePath = path.join(backgroundsDir, filename);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        deletedFiles.push(filename);
      } else {
        notFoundFiles.push(filename);
      }
    }
    
    res.json({ 
      success: true, 
      message: `${deletedFiles.length} background files deleted`,
      deleted: deletedFiles,
      notFound: notFoundFiles
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset all backgrounds (delete all files)
app.delete('/api/backgrounds/reset', async (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, 'test-backgrounds');
    
    if (await fs.pathExists(backgroundsDir)) {
      const files = await fs.readdir(backgroundsDir);
      const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
      
      // Delete all image files
      for (const file of imageFiles) {
        await fs.remove(path.join(backgroundsDir, file));
      }
      
      res.json({ 
        success: true, 
        message: `All ${imageFiles.length} background files have been deleted`,
        deletedCount: imageFiles.length
      });
    } else {
      res.json({ 
        success: true, 
        message: 'No backgrounds directory found',
        deletedCount: 0
      });
    }
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