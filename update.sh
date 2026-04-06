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
npm ci --omit=dev

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Building..."
npm run build

echo "==> Restarting app..."
pm2 restart toa-planner

echo "==> Done!"
pm2 status toa-planner
