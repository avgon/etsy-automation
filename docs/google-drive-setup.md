# Google Drive API Kurulum Rehberi

## 1. Google Cloud Console'da Proje Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni proje oluşturun veya mevcut bir projeyi seçin
3. Proje adını "Etsy Automation" veya benzeri bir isim verin

## 2. Google Drive API'yi Etkinleştirme

1. Sol menüden "APIs & Services" > "Library" seçin
2. "Google Drive API" arayın ve seçin
3. "Enable" butonuna tıklayın

## 3. OAuth 2.0 Kimlik Bilgileri Oluşturma

1. "APIs & Services" > "Credentials" sayfasına gidin
2. "+ CREATE CREDENTIALS" > "OAuth client ID" seçin
3. Uygulama türü olarak "Desktop application" seçin
4. İsim verin ve "Create" butonuna tıklayın
5. Client ID ve Client Secret'i kopyalayın

## 4. OAuth Consent Screen Ayarlama

1. "OAuth consent screen" sekmesine gidin
2. User Type olarak "External" seçin (internal sadece G Suite kullanıcıları için)
3. Gerekli bilgileri doldurun:
   - App name: "Etsy Automation Tool"
   - User support email: Email adresiniz
   - Developer contact email: Email adresiniz

## 5. Test Kullanıcısı Ekleme

1. OAuth consent screen sayfasında "Test users" kısmına gidin
2. "+ ADD USERS" ile email adresinizi ekleyin

## 6. Refresh Token Alma

Aşağıdaki script'i çalıştırarak refresh token alın:

```javascript
// oauth-setup.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your_client_id_here';
const CLIENT_SECRET = 'your_client_secret_here';
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Yetkilendirme kodunu buraya yapıştırın: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Bu token\'ı .env dosyanıza GOOGLE_REFRESH_TOKEN olarak ekleyin');
  } catch (error) {
    console.error('Token alma hatası:', error);
  }
  rl.close();
});
```

## 7. İzlenecek Klasörün ID'sini Alma

1. Google Drive'da izlemek istediğiniz klasörü açın
2. URL'den klasör ID'sini kopyalayın:
   ```
   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74mMjjvfvTiS
   ```
   Bu örnekte ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74mMjjvfvTiS`

## 8. .env Dosyasını Güncelleme

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_3
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_3
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_from_step_6
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_from_step_7
```

## 9. Test Etme

Program başladığında Google Drive bağlantısını test edecek ve loglar üzerinden durumu görebilirsiniz.

## Sık Karşılaşılan Sorunlar

### "Access blocked" Hatası
- OAuth consent screen'i publish etmeniz gerekebilir
- Test kullanıcıları listesine email'inizi eklediğinizden emin olun

### "Invalid credentials" Hatası
- Client ID ve Client Secret'in doğru olduğunu kontrol edin
- Refresh token'ın geçerli olduğunu kontrol edin

### Quota Aşımı
- Google Drive API günlük 1 milyar istek limitine sahiptir
- Normal kullanımda bu limit aşılmaz

## Güvenlik Notları

- Client Secret'i asla public repository'de paylaşmayın
- Refresh token'ı güvenli saklayın
- Düzenli olarak kullanılmayan credentials'ları silin