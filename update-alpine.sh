#!/bin/bash
set -e

# Zorg dat pm2 vindbaar is (npm global bin staat niet standaard in PATH op Alpine)
export PATH="$(npm config get prefix)/bin:$PATH"

APP_DIR="/opt/toa-planner"
cd "$APP_DIR"

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
