#!/bin/bash
set -e

echo "══════════════════════════════════════"
echo "  VizEz Deployment 🚀 Full System"
echo "══════════════════════════════════════"
echo ""

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install frontend deps
echo "📦 Installing frontend dependencies..."
npm install --production=false

# Install backend deps
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install Lens deps
echo "📦 Installing Lens dependencies..."
cd lens && npm install && cd ..

# Build Next.js frontend
echo "🔨 Building Next.js frontend..."
npm run build

# Build Lens dashboard
echo "🔨 Building VizEz Lens..."
cd lens && npm run build && cd ..

# Copy env files for Lens
if [ ! -f lens/.env ]; then
  echo "📋 Creating Lens .env from production template..."
  cat > lens/.env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vizez
JWT_SECRET=vizez-lens-jwt-secret-2026-production
ADMIN_SECRET_KEY="#7294879348uwi83hsndnsdbe"
PASSPORT_PROCESSOR_URL=http://localhost:8000
PROCESSOR_SECRET=aa5147ffbc6645f9e58f32ff022cfbb0a80bdbad41eb855d81f8c93a00e420bc
NEXT_PUBLIC_APP_NAME=VizEz Lens
ENVEOF
fi

# Setup Nginx for Lens (first time only)
if [ ! -f /etc/nginx/sites-available/lens.vizez.cloud ]; then
  echo "🌐 Setting up Nginx for lens.vizez.cloud..."
  sudo cp nginx.lens.vizez.conf /etc/nginx/sites-available/lens.vizez.cloud
  sudo ln -sf /etc/nginx/sites-available/lens.vizez.cloud /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  echo "🔐 Obtaining SSL certificate..."
  sudo certbot --nginx -d lens.vizez.cloud --non-interactive --agree-tos
fi

# Set PROCESSOR_SECRET for passport-processor
if ! grep -q "PROCESSOR_SECRET" /etc/environment 2>/dev/null; then
  echo "🔑 Setting PROCESSOR_SECRET in environment..."
  echo 'PROCESSOR_SECRET=aa5147ffbc6645f9e58f32ff022cfbb0a80bdbad41eb855d81f8c93a00e420bc' | sudo tee -a /etc/environment > /dev/null
fi

# Also add to .env.local if the backend reads from there
if [ -f .env.local ] && ! grep -q "PROCESSOR_SECRET" .env.local; then
  echo 'PROCESSOR_SECRET=aa5147ffbc6645f9e58f32ff022cfbb0a80bdbad41eb855d81f8c93a00e420bc' >> .env.local
fi

# Restart PM2 (all services including lens)
echo "🔄 Restarting PM2 processes..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

# Restart passport-processor with the new secret
echo "🔄 Restarting passport-processor..."
export PROCESSOR_SECRET=aa5147ffbc6645f9e58f32ff022cfbb0a80bdbad41eb855d81f8c93a00e420bc
pm2 restart vizez-processor --update-env 2>/dev/null || echo "   (processor managed separately)"

# Save PM2 config
pm2 save

echo ""
echo "✅ Deployment complete!"
echo "   Frontend:  http://localhost:3001  → https://earlyaccess.vizez.cloud"
echo "   Backend:   http://localhost:4000"
echo "   Lens:      http://localhost:3002  → https://lens.vizez.cloud"
echo "   Processor: http://localhost:8000  (secured with X-Processor-Key)"
echo ""
