#!/bin/bash

# PortalV2 Deployment Script
# Ovaj skript automatizuje osnovne korake deployment-a

set -e  # Zaustavi skriptu ako se desi greška

echo "🚀 PortalV2 Deployment Script"
echo "=============================="
echo ""

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funkcija za proveru komandi
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 nije instaliran. Molimo instalirajte ga prvo.${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $1 je instaliran${NC}"
    fi
}

# Provera preduslova
echo "📋 Provera preduslova..."
check_command node
check_command npm
check_command psql

echo ""
echo "📦 Instalacija dependencies..."
npm install

echo ""
echo "🔧 Generisanje Prisma Client-a..."
npx prisma generate

echo ""
echo "📝 Provera .env fajla..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env fajl ne postoji!${NC}"
    echo "Kreiranje .env fajla iz .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Molimo ažurirajte .env fajl sa vašim vrednostima!${NC}"
        echo "Nakon što ažurirate .env, pokrenite ponovo ovaj skript."
        exit 1
    else
        echo -e "${RED}❌ .env.example fajl ne postoji!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env fajl postoji${NC}"
fi

echo ""
echo "🗄️  Pokretanje Prisma migracija..."
npx prisma migrate deploy

echo ""
echo "🏗️  Build aplikacije..."
npm run build

echo ""
echo -e "${GREEN}✅ Build završen uspešno!${NC}"
echo ""
echo "📋 Sledeći koraci:"
echo "1. Proverite da li je .env fajl pravilno konfigurisan"
echo "2. Pokrenite aplikaciju sa: pm2 start npm --name 'portalv2' -- start"
echo "3. Konfigurišite Nginx kao reverse proxy"
echo "4. Otvorite http://77.77.207.36 u browser-u"
echo ""
echo "Za detaljne instrukcije, pogledajte DEPLOYMENT_GUIDE.md"

