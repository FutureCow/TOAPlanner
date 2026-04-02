# TOA Practicum Planner

Een zelf-gehoste weekkalender waarmee docenten practicums kunnen inplannen en de TOA in één oogopslag ziet wat wanneer gedaan moet worden.

## Functionaliteit

- **Weekkalender** per vak (Natuurkunde, Scheikunde, Biologie, Project/NLT) + gecombineerd overzicht
- **Aanvragen aanmaken** door op een uur te klikken — naam, lokaal, datum en uur invullen
- **Meerdere aanvragen** per uur mogelijk, gestapeld weergegeven
- **Statusbeheer** door de TOA: grijs (aangevraagd), groen (met TOA), geel (zonder TOA), rood (afgekeurd)
- **Google SSO** — inloggen met schoolaccount, automatisch beperkt tot het schooldomein
- **Adminpaneel** — aanvragen filteren en bulk verwijderen, gebruikers en rollen beheren, aanmeldingen open/dicht zetten

## Technische stack

| Onderdeel | Technologie |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Stijl | Tailwind CSS (donker thema) |
| Authenticatie | NextAuth.js v4 + Google OAuth |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Runtime | Node.js 20+ |
| Procescbeheer | PM2 |
| Reverse proxy | Nginx |

## Vereisten

- Node.js 20 of hoger
- PostgreSQL 16
- Een Google Cloud project met OAuth 2.0 credentials
- Een Google Workspace schooldomein

---

## Installatie

Zie [INSTALL-ALPINE.md](INSTALL-ALPINE.md) voor een volledige installatiehandleiding op **Alpine Linux**.

Voor andere systemen, zie [DEPLOYMENT.md](DEPLOYMENT.md).

### Snelstart (development)

```bash
# 1. Kloon de repository
git clone https://github.com/jouwgebruiker/toa-planner-v2.git
cd toa-planner-v2

# 2. Installeer dependencies
npm install

# 3. Configureer omgevingsvariabelen
cp .env.example .env
# Bewerk .env met jouw waarden (zie hieronder)

# 4. Genereer Prisma client
npx prisma generate

# 5. Voer database migraties uit
npx prisma migrate dev

# 6. Seed de database (AppSettings singleton)
npx prisma db seed

# 7. Start de development server
npm run dev
```

De app is bereikbaar op [http://localhost:3000](http://localhost:3000).

### Omgevingsvariabelen

Kopieer `.env.example` naar `.env` en vul de volgende waarden in:

| Variabele | Beschrijving |
|---|---|
| `DATABASE_URL` | PostgreSQL connectiestring, bijv. `postgresql://user:pass@localhost:5432/toa_planner` |
| `NEXTAUTH_URL` | Publieke URL van de app, bijv. `https://toa.school.nl` |
| `NEXTAUTH_SECRET` | Willekeurige geheime sleutel — genereer met `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID uit Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret uit Google Cloud Console |
| `ALLOWED_DOMAIN` | Toegestaan e-maildomein, bijv. `school.nl` |

### Google OAuth instellen

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Klik **Create Credentials** → **OAuth 2.0 Client ID** → **Web application**
3. Voeg toe bij **Authorized redirect URIs**:
   ```
   https://jouwdomein.nl/api/auth/callback/google
   ```
4. Kopieer de Client ID en Client Secret naar `.env`

### Eerste beheerder instellen

Na de eerste keer inloggen moet je jezelf handmatig beheerder maken via psql:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'jouw@school.nl';
```

---

## Rollen

| Rol | Mogelijkheden |
|---|---|
| **Docent** | Eigen aanvragen aanmaken, bewerken en verwijderen |
| **TOA** | Alle aanvragen bekijken, status wijzigen, bewerken en verwijderen |
| **Admin** | Alles van TOA + toegang tot het adminpaneel |

Rollen zijn combineerbaar — iemand kan tegelijk Docent en TOA zijn.

---

## Tests uitvoeren

```bash
npm test
```

---

## Licentie

MIT
