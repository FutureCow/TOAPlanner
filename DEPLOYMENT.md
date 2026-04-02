# Deployment

## Prerequisites
- Node.js 20+
- PostgreSQL 16
- PM2: `npm install -g pm2`
- Nginx + Certbot

## Steps

1. Clone repo and install:
   ```bash
   git clone <repo> && cd toa-planner-v2
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET,
   # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_DOMAIN
   ```

3. Setup database:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Build:
   ```bash
   npm run build
   ```

5. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # follow the printed command to auto-start on boot
   ```

6. Configure Nginx:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/toa-planner
   sudo ln -s /etc/nginx/sites-available/toa-planner /etc/nginx/sites-enabled/
   sudo certbot --nginx -d yourdomain.nl
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Google OAuth Setup

1. Go to console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://yourdomain.nl/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

## First Admin User

After first login, set yourself as admin via psql:
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'youremail@school.nl';
```
