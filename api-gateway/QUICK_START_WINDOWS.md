# ⚡ Quick Start - Windows 11 API Gateway Setup

## 🎯 Ukratko - 5 Koraka

### 1️⃣ Instaliraj Node.js
- Preuzmi sa: https://nodejs.org/ (LTS verzija)
- Instaliraj

### 2️⃣ Kopiraj API Gateway
```powershell
mkdir C:\erp-api-gateway
cd C:\erp-api-gateway
# Kopiraj fajlove iz api-gateway foldera
```

### 3️⃣ Instaliraj Dependencies
```powershell
npm install
```

### 4️⃣ Konfiguracija
```powershell
copy env.example .env
notepad .env
```

**Ažuriraj:**
- `ERP_DB_SERVER=192.168.0.87\SQLEXPRESS`
- `ERP_DB_USER` i `ERP_DB_PASSWORD`
- `API_KEY` (generiši: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

### 5️⃣ Pokreni
```powershell
# Test
node server.js

# Production
npm install -g pm2
pm2 start server.js --name erp-api-gateway
pm2 save
pm2-startup install
```

## ✅ Testiranje

```powershell
# Browser
http://localhost:3001/health

# PowerShell
Invoke-WebRequest -Uri http://localhost:3001/health
```

## 📖 Detaljno

Pogledaj `WINDOWS_SETUP.md` za detaljne instrukcije i troubleshooting.

