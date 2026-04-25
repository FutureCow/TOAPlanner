#!/bin/bash
# setup-school.sh — voeg een nieuwe school toe aan TOA Planner (multi-tenant)
set -e

APP_DIR="/opt/toa-planner"
cd "$APP_DIR"

# Laad globale .env (bevat NEXTAUTH_SECRET, NEXTAUTH_URL, etc.)
set -a
source "$APP_DIR/.env"
set +a

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

SCHOOLS_FILE="$APP_DIR/schools.json"
[ -f "$SCHOOLS_FILE" ] || echo '{}' > "$SCHOOLS_FILE"

# Bouw JSON entry
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

# Voeg toe aan bestaande schools.json via node
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
