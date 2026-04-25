#!/bin/bash
# migrate-all.sh — voer Prisma-migraties uit op alle scholen in schools.json
set -e

APP_DIR="/opt/toa-planner"
cd "$APP_DIR"

SCHOOLS_FILE="$APP_DIR/schools.json"
[ -f "$SCHOOLS_FILE" ] || { echo "Geen schools.json gevonden."; exit 1; }

node -e "
const data = JSON.parse(require('fs').readFileSync('$SCHOOLS_FILE', 'utf8'));
Object.entries(data).forEach(([slug, cfg]) => {
  process.stdout.write(slug + '|' + cfg.databaseUrl + '\n');
});
" | while IFS='|' read -r SLUG DB_URL; do
  echo ""
  echo "==> Migraties voor school: $SLUG"
  DATABASE_URL="$DB_URL" npx prisma migrate deploy
  echo "    ✓ Klaar"
done

echo ""
echo "Alle scholen bijgewerkt."
