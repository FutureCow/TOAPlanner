# Installatiehandleiding — Alpine Linux

Deze handleiding beschrijft hoe je de TOA Practicum Planner installeert op een Alpine Linux server (bijv. een VPS of schoolserver).

Geschikt voor: Alpine Linux 3.18 of nieuwer.

---

## 1. Systeem voorbereiden

```bash
apk update && apk upgrade
apk add git curl bash openssl
```

---

## 2. Node.js installeren

```bash
apk add nodejs npm
node --version   # verwacht: v20.x of hoger
npm --version
```

Als de Alpine-repository een oudere versie heeft, installeer dan via de community repository:

```bash
apk add --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community nodejs npm
```

---

## 3. PostgreSQL installeren en starten

```bash
apk add postgresql postgresql-client

# Initialiseer de database
mkdir -p /var/lib/postgresql/data
chown postgres:postgres /var/lib/postgresql/data
su - postgres -c "initdb -D /var/lib/postgresql/data"

# Start PostgreSQL
rc-service postgresql start

# Zet PostgreSQL aan bij opstarten
rc-update add postgresql default
```

### Database en gebruiker aanmaken

```bash
su - postgres -c "psql" <<EOF
CREATE USER toa_user WITH PASSWORD 'kies_een_sterk_wachtwoord';
CREATE DATABASE toa_planner OWNER toa_user;
GRANT ALL PRIVILEGES ON DATABASE toa_planner TO toa_user;
\q
EOF
```

---

## 4. Nginx installeren

```bash
apk add nginx

# Zet Nginx aan bij opstarten
rc-update add nginx default
```

---

## 5. PM2 installeren (procescbeheer)

```bash
npm install -g pm2
```

---

## 6. App installeren

```bash
# Kloon de repository (pas URL aan)
git clone https://github.com/jouwgebruiker/toa-planner-v2.git /opt/toa-planner
cd /opt/toa-planner

# Installeer Node.js dependencies
npm install
```

---

## 7. Omgevingsvariabelen configureren

```bash
cp .env.example .env
```

Bewerk `.env`:

```bash
vi .env
```

Vul in:

```env
DATABASE_URL="postgresql://toa_user:kies_een_sterk_wachtwoord@localhost:5432/toa_planner"
NEXTAUTH_URL="https://jouwdomein.nl"
NEXTAUTH_SECRET="plak_hier_de_gegenereerde_sleutel"
GOOGLE_CLIENT_ID="jouw-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="jouw-client-secret"
ALLOWED_DOMAIN="jouwschool.nl"
```

Genereer een geheime sleutel:

```bash
openssl rand -base64 32
```

---

## 8. Database klaarmaken

```bash
cd /opt/toa-planner

# Genereer Prisma client
npx prisma generate

# Voer migraties uit
npx prisma migrate deploy

# Seed de database (aanmeldingen-instelling aanmaken)
npx prisma db seed
```

---

## 9. App bouwen

```bash
npm run build
```

---

## 10. App starten met PM2

```bash
pm2 start ecosystem.config.js
pm2 save

# Zorg dat PM2 automatisch start na herstart
pm2 startup
# Voer het commando uit dat pm2 afdrukt
```

Controleer of de app draait:

```bash
pm2 status
pm2 logs toa-planner
```

De app draait nu op poort 3000 (intern).

---

## 11. Nginx configureren

Kopieer de voorbeeldconfiguratie:

```bash
cp /opt/toa-planner/nginx.conf /etc/nginx/http.d/toa-planner.conf
```

Pas het domein aan in `/etc/nginx/http.d/toa-planner.conf`:

```bash
vi /etc/nginx/http.d/toa-planner.conf
# Vervang 'yourdomain.nl' door jouw echte domein
```

Verwijder de standaard Nginx-pagina als die bestaat:

```bash
rm -f /etc/nginx/http.d/default.conf
```

Test en herlaad Nginx:

```bash
nginx -t
rc-service nginx restart
```

---

## 12. HTTPS met Let's Encrypt (Certbot)

```bash
apk add certbot certbot-nginx

certbot --nginx -d jouwdomein.nl

# Automatische verlenging instellen
echo "0 3 * * * certbot renew --quiet" >> /etc/crontabs/root
```

---

## 13. Eerste beheerder instellen

Log in via de app met je schoolaccount. Stel daarna jezelf in als beheerder via psql:

```bash
su - postgres -c "psql toa_planner" <<EOF
UPDATE "User" SET "isAdmin" = true WHERE email = 'jouw@school.nl';
\q
EOF
```

---

## Beheer

### App bijwerken

```bash
cd /opt/toa-planner
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart toa-planner
```

### Logs bekijken

```bash
pm2 logs toa-planner
```

### App herstarten

```bash
pm2 restart toa-planner
```

### Database backup

```bash
su - postgres -c "pg_dump toa_planner" > /backup/toa-planner-$(date +%Y%m%d).sql
```

---

## Probleemoplossing

**App start niet**
```bash
pm2 logs toa-planner --lines 50
```
Controleer of `.env` correct is en `DATABASE_URL` bereikbaar is.

**PostgreSQL verbinding mislukt**
```bash
su - postgres -c "psql -c '\l'"   # lijst van databases
rc-service postgresql status
```

**Nginx geeft 502 Bad Gateway**
```bash
pm2 status   # controleer of de app draait op poort 3000
```

**Certificaat verlopen**
```bash
certbot renew
rc-service nginx reload
```
