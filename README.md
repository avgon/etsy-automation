# Etsy Automation Tool

Bu program, Google Drive'daki yeni klasörleri otomatik olarak izler, içindeki fotoğrafları ChatGPT ile işleyerek arka plan ekler, 3000x3000 boyutuna getirir ve Etsy'de otomatik olarak listeler.

## Özellikler

- ✅ Google Drive klasör izleme
- ✅ ChatGPT ile otomatik arka plan oluşturma
- ✅ 3000x3000 boyutunda görsel işleme
- ✅ Custom GPT ile Etsy SEO optimizasyonu
- ✅ Otomatik Etsy listeleme
- ✅ Kapsamlı hata yönetimi ve loglama

## Kurulum

1. Projeyi klonlayın:
```bash
cd etsy-automation
npm install
```

2. Environment dosyasını oluşturun:
```bash
cp .env.example .env
```

3. `.env` dosyasını kendi API anahtarlarınızla doldurun:

### Google Drive API Setup
1. [Google Cloud Console](https://console.cloud.google.com/) üzerinden yeni bir proje oluşturun
2. Google Drive API'yi etkinleştirin
3. OAuth 2.0 kimlik bilgileri oluşturun
4. İzlenecek klasörün ID'sini alın

### OpenAI API Setup
1. [OpenAI Platform](https://platform.openai.com/) üzerinden API anahtarı alın
2. Custom GPT oluşturduysanız ID'sini ekleyin

### Etsy API Setup
1. [Etsy Developer](https://www.etsy.com/developers/) hesabı oluşturun
2. Uygulama kaydı yapın ve API anahtarları alın
3. OAuth token'ları ayarlayın

## Kullanım

```bash
# Üretim modunda çalıştır
npm start

# Geliştirme modunda çalıştır (auto-reload)
npm run dev
```

## Çalışma Mantığı

1. **Klasör İzleme**: Program belirlenen Google Drive klasörünü düzenli aralıklarla kontrol eder
2. **Yeni Klasör Tespiti**: Yeni alt klasörler tespit edildiğinde işleme başlar
3. **Görsel İndirme**: Klasördeki tüm görseller yerel olarak indirilir
4. **Arka Plan Oluşturma**: ChatGPT Vision API ile ürün analizi yapılır ve uygun arka plan promptu oluşturulur
5. **Görsel İşleme**: DALL-E ile arka plan oluşturulur ve ürün görseli ile birleştirilir
6. **Boyutlandırma**: Görseller 3000x3000 boyutuna getirilir
7. **SEO İçerik Oluşturma**: Custom GPT ile Etsy için optimize edilmiş başlık, açıklama ve etiketler oluşturulur
8. **Etsy Listeleme**: Ürün otomatik olarak Etsy'de listelenir

## Klasör Yapısı

```
etsy-automation/
├── src/
│   ├── config/           # Konfigürasyon dosyaları
│   ├── services/         # Ana servis sınıfları
│   │   ├── googleDrive.js    # Google Drive entegrasyonu
│   │   ├── openai.js         # ChatGPT/OpenAI entegrasyonu
│   │   ├── imageProcessor.js # Görsel işleme
│   │   └── etsy.js           # Etsy API entegrasyonu
│   ├── utils/            # Yardımcı araçlar
│   │   └── logger.js         # Loglama sistemi
│   └── index.js          # Ana uygulama dosyası
├── logs/                 # Sistem logları
├── temp/                 # Geçici dosyalar (otomatik temizlenir)
├── package.json
├── .env                  # Environment variables (manuel oluşturulacak)
└── README.md
```

## Yapılandırma

### Görsel İşleme Ayarları
- `OUTPUT_IMAGE_SIZE`: Çıktı görsel boyutu (varsayılan: 3000)
- `PROCESSING_INTERVAL`: Klasör kontrol aralığı ms cinsinden (varsayılan: 60000)

### Desteklenen Görsel Formatları
- JPEG
- PNG
- WebP
- TIFF

## Hata Yönetimi

Program kapsamlı hata yönetimi içerir:
- Tüm hatalar `logs/error.log` dosyasına kaydedilir
- Genel aktivite logları `logs/combined.log` dosyasında tutulur
- Kritik hatalar durumunda program çalışmaya devam eder
- Temp dosyalar otomatik olarak temizlenir

## Güvenlik

- API anahtarları environment değişkenlerinde saklanır
- Geçici dosyalar işlem sonrası silinir
- Tüm API çağrıları rate limiting kurallarına uyar

## Sık Karşılaşılan Sorunlar

1. **Google Drive API Quota**: Yoğun kullanımda quota sınırlarına dikkat edin
2. **OpenAI Rate Limits**: API çağrı limitlerini aşmamaya dikkat edin
3. **Etsy API Limits**: Günlük liste ekleme limitlerini kontrol edin
4. **Disk Alanı**: Geçici dosyalar için yeterli disk alanı bırakın

## Lisans

MIT License - Detaylar için LICENSE dosyasını inceleyiniz.