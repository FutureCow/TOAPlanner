#!/bin/bash
# setup-school.sh — beheer scholen in TOA Planner (multi-tenant)
set -e

APP_DIR="/opt/toa-planner"
cd "$APP_DIR"

# Laad globale .env
set -a
source "$APP_DIR/.env"
set +a

SCHOOLS_FILE="$APP_DIR/schools.json"

# ── Actie kiezen ─────────────────────────────────────────────────────────────
echo ""
echo "TOA Planner — Schoolbeheer"
echo "--------------------------"
echo "1) School toevoegen"
echo "2) School verwijderen"
echo "3) School hernoemen (slug / subdomein)"
echo ""
read -p "Keuze [1/2/3]: " ACTION

# ════════════════════════════════════════════════════════════════════════════
# SCHOOL VERWIJDEREN
# ════════════════════════════════════════════════════════════════════════════
if [ "$ACTION" = "2" ]; then
  [ -f "$SCHOOLS_FILE" ] || { echo "Geen schools.json gevonden."; exit 1; }

  echo ""
  echo "Bekende scholen:"
  node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
Object.keys(data).forEach(k => console.log('  •', k, '—', data[k].name));
"

  echo ""
  read -p "School slug om te verwijderen: " SLUG
  [ -z "$SLUG" ] && { echo "Geen slug opgegeven."; exit 1; }

  # Haal DB-gegevens op uit schools.json
  DB_URL=$(node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
if (!data['$SLUG']) { console.error('School niet gevonden: $SLUG'); process.exit(1); }
console.log(data['$SLUG'].databaseUrl);
")

  # Extraheer DB-naam en gebruiker uit de connection string
  # postgresql://user:pass@host:port/dbname
  DB_USER=$(echo "$DB_URL" | sed 's|postgresql://||' | cut -d: -f1)
  DB_NAME=$(echo "$DB_URL" | sed 's|.*/||')

  echo ""
  echo "==> Dit wordt verwijderd:"
  echo "    • School '$SLUG' uit schools.json"
  echo "    • PostgreSQL database: $DB_NAME"
  echo "    • PostgreSQL gebruiker: $DB_USER"
  echo ""
  read -p "Weet je het zeker? Type de slug ter bevestiging: " CONFIRM
  [ "$CONFIRM" != "$SLUG" ] && { echo "Geannuleerd."; exit 0; }

  # Verwijder uit schools.json
  echo "==> schools.json bijwerken..."
  node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$SCHOOLS_FILE', 'utf8'));
delete data['$SLUG'];
fs.writeFileSync('$SCHOOLS_FILE', JSON.stringify(data, null, 2));
console.log('School verwijderd uit schools.json');
"

  # Drop database en gebruiker
  echo "==> PostgreSQL database en gebruiker verwijderen..."
  su - postgres -c "psql" <<EOF
\set ON_ERROR_STOP off
DROP DATABASE IF EXISTS "$DB_NAME";
DROP USER IF EXISTS "$DB_USER";
\set ON_ERROR_STOP on
EOF

  echo ""
  echo "==> Klaar! School '$SLUG' is verwijderd."
  echo "    Herstart de app: pm2 restart toa-planner"
  echo ""
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# SCHOOL HERNOEMEN
# ════════════════════════════════════════════════════════════════════════════
if [ "$ACTION" = "3" ]; then
  [ -f "$SCHOOLS_FILE" ] || { echo "Geen schools.json gevonden."; exit 1; }

  echo ""
  echo "Bekende scholen:"
  node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
Object.keys(data).forEach(k => console.log('  •', k, '—', data[k].name));
"

  echo ""
  read -p "Huidige slug:  " OLD_SLUG
  [ -z "$OLD_SLUG" ] && { echo "Geen slug opgegeven."; exit 1; }

  read -p "Nieuwe slug:   " NEW_SLUG
  [ -z "$NEW_SLUG" ] && { echo "Geen slug opgegeven."; exit 1; }
  [ "$OLD_SLUG" = "$NEW_SLUG" ] && { echo "Slugs zijn gelijk, niets te doen."; exit 0; }

  # Controleer of oude slug bestaat en nieuwe nog niet
  node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
if (!data['$OLD_SLUG']) { console.error('School niet gevonden: $OLD_SLUG'); process.exit(1); }
if (data['$NEW_SLUG'])  { console.error('Slug al in gebruik: $NEW_SLUG'); process.exit(1); }
"

  echo ""
  read -p "Bevestig: hernoem '$OLD_SLUG' naar '$NEW_SLUG'? [j/N] " CONFIRM
  [ "$CONFIRM" != "j" ] && { echo "Geannuleerd."; exit 0; }

  # Hernoem de sleutel in schools.json
  node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$SCHOOLS_FILE', 'utf8'));
data['$NEW_SLUG'] = data['$OLD_SLUG'];
delete data['$OLD_SLUG'];
fs.writeFileSync('$SCHOOLS_FILE', JSON.stringify(data, null, 2));
console.log('schools.json bijgewerkt');
"

  SCHOOL_NAME=$(node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
console.log(data['$NEW_SLUG'].name);
")

  echo ""
  echo "==> Klaar! Vergeet niet:"
  echo "    • DNS: wijs $NEW_SLUG.toaplanner.nl naar de server"
  echo "    • Verwijder DNS-record voor $OLD_SLUG.toaplanner.nl"
  echo "    • Google OAuth: voeg redirect URI toe:"
  echo "      https://${NEW_SLUG}.toaplanner.nl/api/auth/callback/google"
  echo "    • Google OAuth: verwijder oude redirect URI:"
  echo "      https://${OLD_SLUG}.toaplanner.nl/api/auth/callback/google"
  echo "    • Als Caddy een aparte regel heeft voor $OLD_SLUG: pas die aan"
  echo "    • Herstart de app: pm2 restart toa-planner"
  echo ""
  echo "    School '$SCHOOL_NAME' is nu bereikbaar op:"
  echo "    https://${NEW_SLUG}.toaplanner.nl"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# SCHOOL TOEVOEGEN
# ════════════════════════════════════════════════════════════════════════════

# ── Invoer ──────────────────────────────────────────────────────────────────
read -p "School slug (subdomein, bijv. 'amersfoortseberg'): " SLUG
read -p "Volledige naam van de school: " SCHOOL_NAME
read -p "Toegestaan e-maildomein (bijv. 'school.nl'): " ALLOWED_DOMAIN
read -p "PostgreSQL database naam [toa_${SLUG}]: " DB_NAME
DB_NAME="${DB_NAME:-toa_${SLUG}}"
read -p "PostgreSQL gebruikersnaam [toa_${SLUG}]: " DB_USER
DB_USER="${DB_USER:-toa_${SLUG}}"
read -s -p "PostgreSQL wachtwoord voor gebruiker '$DB_USER': " DB_PASS
echo
read -p "Google Client ID (leeg = overslaan): " GOOGLE_CLIENT_ID
if [ -n "$GOOGLE_CLIENT_ID" ]; then
  read -s -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
  echo
fi
read -p "Azure AD Client ID (leeg = overslaan): " AZURE_CLIENT_ID
if [ -n "$AZURE_CLIENT_ID" ]; then
  read -s -p "Azure AD Client Secret: " AZURE_CLIENT_SECRET
  echo
  read -p "Azure AD Tenant ID: " AZURE_TENANT_ID
fi

DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── Gebruiker en database aanmaken ───────────────────────────────────────────
echo ""
echo "==> PostgreSQL gebruiker aanmaken: $DB_USER"
su - postgres -c "psql" <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASS';
    RAISE NOTICE 'Gebruiker % aangemaakt.', '$DB_USER';
  ELSE
    ALTER USER "$DB_USER" WITH PASSWORD '$DB_PASS';
    RAISE NOTICE 'Gebruiker % bestond al, wachtwoord bijgewerkt.', '$DB_USER';
  END IF;
END
\$\$;

CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
EOF

# ── Migraties uitvoeren op nieuwe database ───────────────────────────────────
echo "==> Migraties uitvoeren..."
DATABASE_URL="$DB_URL" npx prisma migrate deploy

# ── schools.json updaten ─────────────────────────────────────────────────────
echo "==> schools.json bijwerken..."

[ -f "$SCHOOLS_FILE" ] || echo '{}' > "$SCHOOLS_FILE"

ENTRY=$(cat <<JSONEOF
{
  "name": "$SCHOOL_NAME",
  "databaseUrl": "$DB_URL",
  "allowedDomain": "$ALLOWED_DOMAIN"
JSONEOF
)

if [ -n "$GOOGLE_CLIENT_ID" ]; then
  ENTRY="$ENTRY, \"googleClientId\": \"$GOOGLE_CLIENT_ID\", \"googleClientSecret\": \"$GOOGLE_CLIENT_SECRET\""
fi
if [ -n "$AZURE_CLIENT_ID" ]; then
  ENTRY="$ENTRY, \"azureClientId\": \"$AZURE_CLIENT_ID\", \"azureClientSecret\": \"$AZURE_CLIENT_SECRET\", \"azureTenantId\": \"$AZURE_TENANT_ID\""
fi
ENTRY="$ENTRY }"

node -e "
const fs = require('fs');
const f = '$SCHOOLS_FILE';
const data = JSON.parse(fs.readFileSync(f, 'utf8'));
data['$SLUG'] = $ENTRY;
fs.writeFileSync(f, JSON.stringify(data, null, 2));
console.log('schools.json bijgewerkt');
"

# ── Google OAuth redirect URI herinnering ────────────────────────────────────
echo ""
echo "==> Klaar! Vergeet niet:"
echo "    • Voeg deze redirect URI toe aan je Google OAuth app:"
echo "      https://${SLUG}.toaplanner.nl/api/auth/callback/google"
if [ -n "$AZURE_CLIENT_ID" ]; then
  echo "    • Voeg deze redirect URI toe aan je Azure app-registratie:"
  echo "      https://${SLUG}.toaplanner.nl/api/auth/callback/azure-ad"
fi
echo ""
echo "    • Herstart de app: pm2 restart toa-planner"
echo ""
echo "    School '$SCHOOL_NAME' is nu bereikbaar op:"
echo "    https://${SLUG}.toaplanner.nl"
