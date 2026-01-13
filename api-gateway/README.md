# ERP API Gateway

API Gateway server koji omogućava pristup lokalnoj ERP bazi iz cloud servera.

## 📚 Dokumentacija

- **[SUPER_SIMPLE.md](./SUPER_SIMPLE.md)** - 🚀 **NAJJEDNOSTAVNIJI** vodič (3 koraka, 5 minuta) ⭐ **POČNI OVDE!**
- **[TEST_CONNECTION.md](./TEST_CONNECTION.md)** - ✅ Korak-po-korak testiranje konekcije
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - ⚡ Brzi start vodič (10 minuta)
- **[DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md)** - 🚀 Detaljne instrukcije za deployment na cloud
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 🏗️ Arhitektura i dizajn sistema
- **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** - 💻 Detaljne instrukcije za Windows setup

## Instalacija

### Windows (API Gateway Server)

```powershell
npm install
```

**Napomena**: Ako dobiješ greške sa native modulima (mssql), možda treba:
```powershell
npm install --global windows-build-tools
```

### Linux/Ubuntu (Cloud Server - samo za referencu)

```bash
npm install
```

## Konfiguracija

1. Kopiraj `.env.example` u `.env`:
```bash
cp .env.example .env
```

2. Ažuriraj vrednosti u `.env` fajlu:
   - `API_KEY` - generiši siguran API ključ
   - `ERP_DB_SERVER` - IP adresa SQL Server-a
   - `ERP_DB_NAME` - naziv baze podataka
   - `ERP_DB_USER` i `ERP_DB_PASSWORD` - kredencijali za pristup bazi
   - `ERP_LAGER_TABLE` - naziv tabele za lager proizvoda

## Pokretanje

### Windows (API Gateway Server)

**Development:**
```powershell
npm start
# ili
node server.js
```

**Production sa PM2:**
```powershell
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**Ili koristi batch skriptu:**
```powershell
.\start-windows.bat
```

### Linux/Ubuntu (Cloud Server)

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Sa PM2:**
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## API Endpoints

Svi endpoint-i zahtevaju JWT autentikaciju. Prvo dobij token preko `/api/auth/login` endpoint-a.

### Autentikacija

**POST /api/auth/login**
```json
{
  "apiKey": "your-api-key"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

Koristi token u `Authorization: Bearer <token>` header-u za sve ostale zahteve.

### Health Check
```
GET /health
```

### Test Konekcije
```
GET /api/test
Headers: Authorization: Bearer <jwt-token>
```

### Proizvodi
```
GET /api/products
Headers: Authorization: Bearer <jwt-token>
```

### Klijenti
```
GET /api/clients
Headers: Authorization: Bearer <jwt-token>
```

### Podružnice
```
GET /api/branches
Headers: Authorization: Bearer <jwt-token>
```

## Sigurnost

- **JWT Authentication** - svi zahtevi moraju imati validan JWT token
- **API Key** - koristi se za dobijanje JWT tokena (login)
- **Rate Limiting** - maksimum 100 zahteva po minutu
- **CORS** - podešeno za komunikaciju sa cloud serverom
- **HTTPS** - preporučeno za production (koristi reverse proxy sa SSL)

## VPN Setup

Ovaj server mora biti dostupan preko VPN-a sa cloud servera. Preporučeno:
- WireGuard VPN
- Tailscale (najlakše za setup)

**Detaljne instrukcije:** Pogledaj [DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md) za VPN setup.

## Docker Deployment (Opciono)

Ako želiš da koristiš Docker:

```bash
# Build i pokreni
docker-compose up -d

# Pregled logova
docker-compose logs -f

# Zaustavi
docker-compose down
```

**Napomena:** Potreban je `.env` fajl pre pokretanja.

## Troubleshooting

### Problem sa konekcijom na SQL Server
- Proveri da li je SQL Server pokrenut
- Proveri da li je SQL Server konfigurisan da prihvata TCP/IP konekcije
- Proveri firewall pravila
- Proveri SQL Server autentikaciju (Windows Auth vs SQL Auth)

### Problem sa autentikacijom
- Proveri da li je API key tačan u `.env` fajlu
- Proveri da li se API key šalje u `X-API-Key` header-u

### Problem sa VPN konekcijom
- Proveri da li je VPN aktivan
- Ping-uj API Gateway sa cloud servera
- Proveri da li je port 3001 otvoren u firewall-u

### Problem sa PM2: "module is not defined in ES module scope"
**Greška:**
```
ReferenceError: module is not defined in ES module scope
```

**Rešenje:**
- Koristi `ecosystem.config.cjs` umesto `ecosystem.config.js`
- PM2 zahteva CommonJS format kada je `"type": "module"` u `package.json`

**Komanda:**
```powershell
pm2 start ecosystem.config.cjs
```

### Problem: Port 3001 je zauzet
**Greška:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Rešenje:**
```powershell
# Proveri koji proces koristi port 3001
netstat -ano | findstr :3001

# Zaustavi proces (zameni PID sa stvarnim PID-om)
taskkill /PID <PID> /F

# Ili zaustavi sve PM2 procese
pm2 stop all
pm2 delete all
```

