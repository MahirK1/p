#!/bin/bash

# ERP API Gateway Startup Script

echo "🚀 Pokretanje ERP API Gateway servera..."

# Kreiraj logs direktorijum ako ne postoji
mkdir -p logs

# Proveri da li postoji .env fajl
if [ ! -f .env ]; then
    echo "⚠️  .env fajl ne postoji!"
    echo "Kopiraj env.example u .env i ažuriraj vrednosti:"
    echo "  cp env.example .env"
    echo "  nano .env"
    exit 1
fi

# Instaliraj dependencies ako node_modules ne postoji
if [ ! -d "node_modules" ]; then
    echo "📦 Instalacija dependencies..."
    npm install
fi

# Pokreni sa PM2 ako je instaliran
if command -v pm2 &> /dev/null; then
    echo "📡 Pokretanje sa PM2..."
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "✅ Server je pokrenut sa PM2"
    echo "📊 Status: pm2 status"
    echo "📋 Logovi: pm2 logs erp-api-gateway"
else
    echo "⚠️  PM2 nije instaliran. Pokrećem direktno..."
    echo "💡 Instaliraj PM2 za production: npm install -g pm2"
    node server.js
fi

