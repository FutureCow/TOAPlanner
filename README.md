# TOA Practicum Planner

Een zelf-gehoste weekkalender waarmee docenten practicums kunnen inplannen en de TOA in één oogopslag ziet wat wanneer gedaan moet worden.

## Functionaliteit

- **Weekkalender** per vak (Natuurkunde, Scheikunde, Biologie, Project/NLT) + gecombineerd overzicht
- **Aanvragen aanmaken** door op een uur te klikken — naam, lokaal, datum en uur invullen
- **Meerdere aanvragen** per uur mogelijk, gestapeld weergegeven
- **Statusbeheer** door de TOA: grijs (aangevraagd), groen (met TOA), geel (zonder TOA), rood (afgekeurd)
- **Google SSO** — inloggen met schoolaccount, automatisch beperkt tot het schooldomein
- **Microsoft SSO** — optioneel inloggen met Microsoft/Azure AD-account (Office 365 schoolaccount)
- **Adminpaneel** — aanvragen filteren en bulk verwijderen, gebruikers en rollen beheren, aanmeldingen open/dicht zetten

## Technische stack

| Onderdeel | Technologie |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Stijl | Tailwind CSS (donker thema) |
| Authenticatie | NextAuth.js v4 + Google OAuth / Microsoft Azure AD |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Runtime | Node.js 20+ |
| Procescbeheer | PM2 |
| Reverse proxy | Nginx |

## Vereisten

- Node.js 20 of hoger
- PostgreSQL 16
- Een Google Cloud project met OAuth 2.0 credentials, **of** een Azure AD app-registratie
- Een Google Workspace of Microsoft 365 schooldomein

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
| `AZURE_AD_CLIENT_ID` | *(optioneel)* Azure AD Application (client) ID |
| `AZURE_AD_CLIENT_SECRET` | *(optioneel)* Azure AD client secret |
| `AZURE_AD_TENANT_ID` | *(optioneel)* Azure AD tenant ID, standaard `common` |
| `NEXT_PUBLIC_AZURE_AD_ENABLED` | Zet op `1` om de "Inloggen met Microsoft"-knop te tonen |

### Google OAuth instellen

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Klik **Create Credentials** → **OAuth 2.0 Client ID** → **Web application**
3. Voeg toe bij **Authorized redirect URIs**:
   ```
   https://jouwdomein.nl/api/auth/callback/google
   ```
4. Kopieer de Client ID en Client Secret naar `.env`

### Microsoft (Azure AD) OAuth instellen

Gebruik dit als je school Microsoft 365 gebruikt.

1. Ga naar [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App-registraties** → **Nieuwe registratie**
2. Voer een naam in, bijv. `TOA Planner`
3. Kies bij **Ondersteunde accounttypen**: *Accounts in deze organisatiemap* (of *alle organisaties* als je multitenant wilt)
4. Voeg toe bij **Omleidings-URI** (type: Web):
   ```
   https://jouwdomein.nl/api/auth/callback/azure-ad
   ```
5. Na registratie: kopieer de **Application (client) ID** → `AZURE_AD_CLIENT_ID`
6. Kopieer de **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
7. Ga naar **Certificaten en geheimen** → **Nieuw clientgeheim** → kopieer de waarde → `AZURE_AD_CLIENT_SECRET`
8. Stel in `.env` ook `NEXT_PUBLIC_AZURE_AD_ENABLED=1` in om de knop zichtbaar te maken

> **Google én Microsoft tegelijk?** Dat werkt. Voeg gewoon beide sets variabelen toe aan `.env`. Gebruikers zien dan twee inlogknoppen.

### Eerste beheerder instellen

De eerste gebruiker die inlogt krijgt automatisch beheerdersrechten. Daarna kun je anderen via het adminpaneel instellen.

Als de database al gebruikers bevat, stel dan handmatig een beheerder in via psql:

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
