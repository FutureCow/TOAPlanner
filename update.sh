#!/bin/bash
set -e

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
