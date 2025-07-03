# 🚀 Cloud Deployment Guide

## Option 1: DigitalOcean (Recommended)

### 1. Create Droplet
```bash
# 1. DigitalOcean'da Ubuntu 22.04 droplet oluştur ($6/month)
# 2. SSH ile bağlan
ssh root@your-droplet-ip
```

### 2. Install Dependencies
```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose kurulumu
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Git kurulumu
apt update && apt install git -y
```

### 3. Deploy Application
```bash
# Repository'yi clone et
git clone https://github.com/YOUR-USERNAME/etsy-automation.git
cd etsy-automation

# Environment dosyasını oluştur
cp .env.example .env
nano .env  # API key'lerini gir

# Deploy et
docker-compose up -d

# Logs kontrol et
docker-compose logs -f
```

### 4. Domain Setup (Opsiyonel)
```bash
# Nginx kurulumu
apt install nginx -y

# Nginx config
nano /etc/nginx/sites-available/etsy-automation
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Config'i aktifleştir
ln -s /etc/nginx/sites-available/etsy-automation /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# SSL (Let's Encrypt)
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

## Option 2: Railway

### 1. Railway Deploy
```bash
# Railway CLI kurulumu
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### 2. Environment Variables
Railway dashboard'da şu env var'ları ekle:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `OPENAI_API_KEY`
- `CUSTOM_GPT_ID`
- `PORT=3000`

## Option 3: Heroku

### 1. Heroku CLI
```bash
# Heroku CLI kurulumu
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# App oluştur
heroku create your-app-name

# Deploy
git push heroku main
```

### 2. Environment Variables
```bash
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_client_secret
heroku config:set GOOGLE_REFRESH_TOKEN=your_refresh_token
heroku config:set OPENAI_API_KEY=your_openai_key
heroku config:set CUSTOM_GPT_ID=your_gpt_id
```

## Access URLs

After deployment, access your app at:
- **DigitalOcean:** `http://your-droplet-ip:3000`
- **Railway:** `https://your-app.railway.app`
- **Heroku:** `https://your-app-name.herokuapp.com`

## 🔒 Security Notes

1. **Environment Variables:** Never commit .env file
2. **Firewall:** Only allow ports 80, 443, 22
3. **SSL:** Always use HTTPS in production
4. **Updates:** Regularly update dependencies

## 📱 Mobile Access

Once deployed, you can access from:
- 📱 Phone browser
- 💻 Any computer
- 🌍 Anywhere in the world

## 🆘 Troubleshooting

### Check logs:
```bash
# Docker logs
docker-compose logs -f

# System logs
journalctl -u docker -f
```

### Restart service:
```bash
docker-compose restart
```

### Update code:
```bash
git pull
docker-compose build
docker-compose up -d
```