# Railway PostgreSQL Setup Guide

## 1. Railway'e PostgreSQL Database Ekle

```bash
# Railway CLI ile PostgreSQL ekle
railway add postgresql

# Ya da Railway Dashboard'dan:
# Project Settings > Add Service > PostgreSQL
```

## 2. Environment Variables

Railway otomatik olarak şu environment variable'ları ekler:
- `DATABASE_URL` - PostgreSQL connection string
- `PGDATABASE` - Database name
- `PGHOST` - Database host
- `PGPASSWORD` - Database password
- `PGPORT` - Database port (5432)
- `PGUSER` - Database user

## 3. Deployment

```bash
# PostgreSQL dependency'i yükle
npm install pg

# Git'e commit et
git add .
git commit -m "Add PostgreSQL support for persistent database"
git push origin main

# Railway'e deploy et
railway deploy
```

## 4. Database Migration

İlk deploy'dan sonra database tabloları otomatik oluşturulur.

## 5. Test

1. Railway'e deploy et
2. Kullanıcı kayıt ol
3. Redeploy yap
4. Login bilgileri korunmalı ✅

## 6. Backup (Opsiyonel)

```bash
# Database backup al
railway connect postgresql
pg_dump DATABASE_NAME > backup.sql

# Backup restore et
psql DATABASE_NAME < backup.sql
```

## 7. Monitoring

Railway Dashboard'dan:
- Database size
- Connection count
- Query performance
- Logs

## 8. Advantages

✅ **Persistent data** - Deploy'larda kaybolmaz
✅ **Concurrent users** - Multiple user support
✅ **Scalable** - Railway otomatik scale eder
✅ **Backup** - Otomatik backup'lar
✅ **Performance** - SQLite'dan hızlı

## 9. Local Development

Local'de SQLite, production'da PostgreSQL kullanılır:

```javascript
// Otomatik olarak seçer
const db = createDatabase();
```

## 10. Environment Variables

```env
# Railway'de otomatik set edilir
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NODE_ENV=production
```