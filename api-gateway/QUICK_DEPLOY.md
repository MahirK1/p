# ⚡ Brzi Start - API Gateway Deployment

## 🎯 Scenario: API Gateway na Lokalnoj Mreži + Cloud Server preko VPN-a

### Korak 1: Lokalni Računar (Windows) - 5 minuta

```powershell
# 1. Idi u api-gateway folder
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway

# 2. Instaliraj dependencies
npm install

# 3. Kreiraj .env fajl
copy env.example .env
notepad .env
```

**U .env fajlu, ažuriraj:**
```env
PORT=3001
API_KEY=GENERISI_SIGURAN_KLJUC_OVDE
JWT_SECRET=GENERISI_SIGURAN_KLJUC_OVDE
ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
ERP_DB_PORT=1434
ERP_DB_NAME=ITAL_REGISTRI_IMELBIS_
ERP_DB_USER=sa
ERP_DB_PASSWORD=tvoja_lozinka
ERP_LAGER_TABLE=ITAL_IMELBIS_2025
```

**Generiši sigurne ključeve:**
```powershell
# Koristi skriptu za generisanje ključeva (preporučeno)
npm run generate-keys

# Ili PowerShell - generiši random string za API_KEY
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

```powershell
# 4. Testiraj lokalno
npm start
# U drugom terminalu:
curl http://localhost:3001/health
```

```powershell
# 5. Pokreni sa PM2 (production)
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

---

### Korak 2: VPN Setup (Tailscale) - 3 minuta

**Na lokalnom računaru:**
1. Preuzmi Tailscale: https://tailscale.com/download
2. Instaliraj i prijavi se
3. Zapiši Tailscale IP (npr. `100.64.1.2`)

**Na cloud serveru:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Zapiši Tailscale IP cloud servera
```

**Testiraj:**
```bash
# Sa cloud servera
ping 100.64.1.2  # Tailscale IP lokalnog računara
```

---

### Korak 3: Cloud Server Konfiguracija - 2 minuta

```bash
cd /var/www/portalv2
nano .env
```

**Dodaj:**
```env
ERP_API_GATEWAY_URL=http://100.64.1.2:3001  # Tailscale IP lokalnog računara
ERP_API_KEY=ISTI_KAO_U_API_GATEWAY_ENV  # Kopiraj iz API Gateway .env
ERP_JWT_SECRET=ISTI_KAO_U_API_GATEWAY_ENV  # Kopiraj iz API Gateway .env
```

```bash
# Restart aplikacije
pm2 restart portalv2
```

---

### Korak 4: Testiranje - 1 minut

```bash
# Sa cloud servera, testiraj API Gateway
curl http://100.64.1.2:3001/health

# Testiraj autentikaciju
curl -X POST http://100.64.1.2:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"TVOJ_API_KEY"}'
```

---

## ✅ Gotovo!

Ako sve radi, trebalo bi da vidiš:
- ✅ Health check vraća `{"status":"ok"}`
- ✅ Login vraća JWT token
- ✅ Next.js aplikacija može da pristupa ERP podacima

---

## 🐛 Brza Pomoc

**Problem: Connection refused**
```powershell
# Na lokalnom računaru, proveri firewall
New-NetFirewallRule -DisplayName "API Gateway" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Problem: Invalid API Key**
- Proveri da li je `ERP_API_KEY` isti u oba `.env` fajla

**Problem: VPN ne radi**
- Proveri da li su oba računara prijavljena u Tailscale
- Proveri: `tailscale status` na oba računara

---

Za detaljne instrukcije, pogledaj: `DEPLOYMENT_CLOUD.md`

