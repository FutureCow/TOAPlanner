#!/bin/bash
set -e

# Laad omgevingsvariabelen uit .env (Prisma 7 leest .env niet meer automatisch)
set -a
# shellcheck source=.env
source "$(dirname "$0")/.env"
set +a

echo "==> Pulling latest changes..."
git pull

echo "==> Installing dependencies..."
npm ci

echo "==> Running database migrations..."
bash "$(dirname "$0")/migrate-all.sh"

echo "==> Building..."
npm run build

echo "==> Restarting app..."
pm2 restart toa-planner
pm2 restart toa-superadmin --update-env 2>/dev/null || pm2 start ecosystem.config.js --only toa-superadmin

echo "==> Done!"
pm2 status
