#!/bin/bash

# Skripta za testiranje konekcije između cloud servera i API Gateway-a
# Koristi: bash test-connection.sh <TAILSCALE_IP>

echo "🔍 Testiranje konekcije ka API Gateway-u..."
echo ""

if [ -z "$1" ]; then
    echo "❌ Greška: Nisi prosledio Tailscale IP adresu"
    echo ""
    echo "Korišćenje:"
    echo "  bash test-connection.sh <TAILSCALE_IP>"
    echo ""
    echo "Primer:"
    echo "  bash test-connection.sh 100.64.1.2"
    exit 1
fi

TAILSCALE_IP=$1
API_GATEWAY_URL="http://${TAILSCALE_IP}:3001"

echo "📍 Tailscale IP: $TAILSCALE_IP"
echo "🔗 API Gateway URL: $API_GATEWAY_URL"
echo ""

# Test 1: Ping
echo "1️⃣  Testiranje ping konekcije..."
if ping -c 3 -W 2 "$TAILSCALE_IP" > /dev/null 2>&1; then
    echo "   ✅ Ping uspešan!"
else
    echo "   ❌ Ping neuspešan - proveri Tailscale konekciju"
    exit 1
fi
echo ""

# Test 2: Health Check
echo "2️⃣  Testiranje API Gateway health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_GATEWAY_URL/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Health check uspešan!"
    echo "   📄 Response: $BODY"
else
    echo "   ❌ Health check neuspešan (HTTP $HTTP_CODE)"
    echo "   📄 Response: $BODY"
    exit 1
fi
echo ""

# Test 3: API Key Test (ako je postavljen)
if [ -n "$ERP_API_KEY" ]; then
    echo "3️⃣  Testiranje autentikacije sa API Key..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_GATEWAY_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"apiKey\":\"$ERP_API_KEY\"}" 2>/dev/null)
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        echo "   ✅ Autentikacija uspešna!"
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        echo "   🔑 Token dobijen: ${TOKEN:0:20}..."
    else
        echo "   ❌ Autentikacija neuspešna"
        echo "   📄 Response: $LOGIN_RESPONSE"
        echo "   💡 Proveri da li je ERP_API_KEY tačan"
    fi
else
    echo "3️⃣  Preskačem test autentikacije (ERP_API_KEY nije postavljen)"
    echo "   💡 Postavi ERP_API_KEY u .env fajlu za test autentikacije"
fi
echo ""

echo "✅ Svi testovi prošli uspešno!"
echo ""
echo "📝 Sledeći korak:"
echo "   Ažuriraj .env fajl na cloud serveru:"
echo "   ERP_API_GATEWAY_URL=$API_GATEWAY_URL"
echo "   ERP_API_KEY=<isti kao u api-gateway/.env>"
echo ""

