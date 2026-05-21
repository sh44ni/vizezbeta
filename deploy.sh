#!/bin/bash
set -e

echo "══════════════════════════════════════"
echo "  VizEz Deployment — earlyaccess.vizez.cloud"
echo "══════════════════════════════════════"
echo ""

# Pull latest code
echo "→ Pulling latest code..."
git pull origin main

# Install frontend deps
echo "→ Installing frontend dependencies..."
npm install --production=false

# Install backend deps
echo "→ Installing backend dependencies..."
cd backend && npm install && cd ..

# Build Next.js
echo "→ Building Next.js app..."
npm run build

# Restart PM2
echo "→ Restarting PM2 processes..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

echo ""
echo "✅ Deployment complete!"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:4000"
echo "   Live:     https://earlyaccess.vizez.cloud"
echo ""
