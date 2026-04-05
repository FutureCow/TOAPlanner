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
   # Required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ALLOWED_DOMAIN
   # Google login: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   # Microsoft login (optional): AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET,
   #   AZURE_AD_TENANT_ID, NEXT_PUBLIC_AZURE_AD_ENABLED=1
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

## Microsoft (Azure AD) OAuth Setup

Use this if your school uses Microsoft 365. Both Google and Microsoft can be active simultaneously.

1. Go to portal.azure.com → Azure Active Directory → App registrations → New registration
2. Name: `TOA Planner`, supported account types: *accounts in this directory only*
3. Add Redirect URI (Web): `https://yourdomain.nl/api/auth/callback/azure-ad`
4. Copy **Application (client) ID** → `AZURE_AD_CLIENT_ID`
5. Copy **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. Under Certificates & secrets → New client secret → copy value → `AZURE_AD_CLIENT_SECRET`
7. Set `NEXT_PUBLIC_AZURE_AD_ENABLED=1` to show the Microsoft login button

## First Admin User

The first user to log in automatically becomes admin. For existing databases, set manually via psql:
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'youremail@school.nl';
```
