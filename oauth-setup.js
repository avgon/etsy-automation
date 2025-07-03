const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = '1089368684566-ef971k7onvfi2al28irg2m1s4s4r47re.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive']
});

console.log('Bu URL\'e gidin ve yetkilendirme yapın:');
console.log(authUrl);
console.log('\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Yetkilendirme kodunu buraya yapıştırın: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n=== BAŞARILI ===');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('\nBu token\'ı .env dosyanıza GOOGLE_REFRESH_TOKEN olarak ekleyin');
    console.log('\n.env dosyası örneği:');
    console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GOOGLE_REDIRECT_URI=' + REDIRECT_URI);
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here');
  } catch (error) {
    console.error('Token alma hatası:', error);
  }
  rl.close();
});