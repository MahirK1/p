# 🏗️ API Gateway Arhitektura - Kompletan Pregled

## 📋 Pregled

Sve fetch operacije ka ERP bazi idu **preko API Gateway-a** sa lokalnog računara. Cloud server **nikada** ne pristupa direktno SQL Server-u.

---

## 🔄 Arhitektura Toka Podataka

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Cloud Server   │  HTTP   │  API Gateway     │  SQL    │  Lokalna ERP    │
│  (77.77.207.36) │◄───────►│  (100.78.79.7)   │◄───────►│  SQL Server     │
│                 │  VPN    │  Port 3001       │         │  (192.168.0.87) │
│  Next.js App    │         │  Express Server  │         │  Port 1434      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## 📦 Komponente

### 1. API Gateway (`api-gateway/`)
- **Lokacija**: Lokalni računar (Windows)
- **Port**: 3001
- **Funkcija**: Bridge između cloud servera i lokalne ERP baze
- **Autentikacija**: JWT token (dobija se sa API_KEY)

### 2. Cloud Server (`/var/www/portalv2`)
- **Lokacija**: Cloud server (Ubuntu/Linux)
- **Funkcija**: Next.js aplikacija koja koristi ERP podatke
- **Pristup ERP-u**: Preko API Gateway-a (HTTP zahtevi)

### 3. ERP Database
- **Lokacija**: Lokalna mreža (192.168.0.87)
- **Tip**: SQL Server
- **Pristup**: Samo sa lokalnog računara (preko API Gateway-a)

---

## 🔌 API Gateway Endpoint-i

### Autentikacija
```
POST /api/auth/login
Body: { "apiKey": "your-api-key" }
Response: { "success": true, "token": "jwt-token", "expiresIn": "24h" }
```

### Proizvodi
```
GET /api/products
Headers: Authorization: Bearer <jwt-token>
Response: { "success": true, "products": [...], "count": 1000 }
```

### Klijenti
```
GET /api/clients
Headers: Authorization: Bearer <jwt-token>
Response: { "success": true, "clients": [...], "count": 500 }
```

### Podružnice
```
GET /api/branches
Headers: Authorization: Bearer <jwt-token>
Response: { "success": true, "branches": [...], "count": 200 }
```

### Test Konekcije
```
GET /api/test
Headers: Authorization: Bearer <jwt-token>
Response: { "success": true, "connected": true }
```

### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "...", "service": "ERP API Gateway" }
```

---

## 💻 Cloud Server Implementacija

### 1. ERP Database Helper (`src/lib/erp-db.ts`)

**Funkcije:**
- `getErpProducts()` - Dohvata proizvode preko API Gateway-a
- `getErpClients()` - Dohvata klijente preko API Gateway-a
- `getErpBranches()` - Dohvata podružnice preko API Gateway-a
- `testErpConnection()` - Testira konekciju sa API Gateway-om

**Kako radi:**
1. Dobija JWT token sa `/api/auth/login` endpoint-a
2. Šalje HTTP zahtev sa `Authorization: Bearer <token>` header-om
3. Vraća podatke u formatu koji aplikacija očekuje

### 2. Sync Funkcije

**`src/lib/sync-products.ts`**
```typescript
import { getErpProducts } from "@/lib/erp-db";

export async function syncProducts() {
  // Dohvata proizvode preko API Gateway-a
  const erpProducts = await getErpProducts();
  // Sinkronizuje u PostgreSQL bazu
  // ...
}
```

**`src/lib/sync-clients.ts`**
```typescript
import { getErpClients } from "@/lib/erp-db";

export async function syncClients() {
  // Dohvata klijente preko API Gateway-a
  const erpClients = await getErpClients();
  // Sinkronizuje u PostgreSQL bazu
  // ...
}
```

**`src/lib/sync-branches.ts`**
```typescript
import { getErpBranches } from "@/lib/erp-db";

export async function syncBranches() {
  // Dohvata podružnice preko API Gateway-a
  const erpBranches = await getErpBranches();
  // Sinkronizuje u PostgreSQL bazu
  // ...
}
```

### 3. API Endpoint-i

**`/api/sync/products`** - Sinkronizacija proizvoda
- Koristi `syncProducts()` funkciju
- Zahteva ADMIN role ili API key

**`/api/sync/clients`** - Sinkronizacija klijenata i podružnica
- Koristi `syncClients()` i `syncBranches()` funkcije
- Zahteva ADMIN role ili API key

**`/api/cron/sync-products`** - Automatska sinkronizacija
- Koristi `syncProducts()` funkciju
- Zahteva CRON_SECRET u Authorization header-u

---

## 🔐 Konfiguracija

### Cloud Server `.env`
```env
# API Gateway Configuration
ERP_API_GATEWAY_URL=http://100.78.79.7:3001  # Tailscale IP lokalnog računara
ERP_API_KEY=your-very-secure-api-key-here     # ISTI kao u api-gateway/.env
ERP_JWT_SECRET=your-very-secure-jwt-secret    # Opciono, ako koristiš custom JWT secret
```

### API Gateway `.env`
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# API Security
API_KEY=your-very-secure-api-key-here  # ISTI kao ERP_API_KEY na cloud serveru
JWT_SECRET=your-very-secure-jwt-secret
JWT_EXPIRES_IN=24h

# ERP Database Configuration
ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
ERP_DB_PORT=1434
ERP_DB_NAME=ITAL_REGISTRI_IMELBIS_
ERP_DB_USER=sa
ERP_DB_PASSWORD=your-password-here
ERP_DB_ENCRYPT=false
ERP_DB_TRUST_CERT=true

# ERP Table Names
ERP_LAGER_TABLE=ITAL_IMELBIS_2025
```

---

## ✅ Checklist - Sve Koristi API Gateway

- [x] **Proizvodi** - `syncProducts()` koristi `getErpProducts()` ✅
- [x] **Klijenti** - `syncClients()` koristi `getErpClients()` ✅
- [x] **Podružnice** - `syncBranches()` koristi `getErpBranches()` ✅
- [x] **Error Handling** - Svi error-i su pravilno obradjeni ✅
- [x] **JWT Authentication** - Svi zahtevi koriste JWT token ✅
- [x] **No Direct SQL** - Nema direktnih SQL konekcija sa cloud servera ✅

---

## 🚀 Kako Koristiti

### 1. Sinkronizacija Proizvoda
```typescript
// Preko admin panela
// Ili direktno:
import { syncProducts } from "@/lib/sync-products";
await syncProducts();
```

### 2. Sinkronizacija Klijenata
```typescript
import { syncClients, syncBranches } from "@/lib/sync-clients";
await syncClients();
await syncBranches();
```

### 3. Test Konekcije
```typescript
import { testErpConnection } from "@/lib/erp-db";
const isConnected = await testErpConnection();
```

---

## 🐛 Troubleshooting

### Problem: "Failed to connect to :1433"
**Uzrok**: Environment varijable nisu postavljene na cloud serveru
**Rešenje**: Proveri `ERP_API_GATEWAY_URL` i `ERP_API_KEY` u `.env` fajlu

### Problem: "Invalid API Key"
**Uzrok**: `ERP_API_KEY` nije isti u oba `.env` fajla
**Rešenje**: Kopiraj `API_KEY` iz `api-gateway/.env` u cloud server `.env`

### Problem: "Connection refused"
**Uzrok**: API Gateway ne radi ili VPN konekcija ne radi
**Rešenje**: 
1. Proveri da li API Gateway radi: `pm2 status` (na lokalnom računaru)
2. Proveri Tailscale VPN: `tailscale status`

---

## 📊 Tok Podataka

### Sinkronizacija Proizvoda
```
1. Admin klikne "Sinkronizuj iz ERP"
   ↓
2. Next.js poziva /api/sync/products
   ↓
3. syncProducts() poziva getErpProducts()
   ↓
4. getErpProducts() šalje HTTP zahtev ka API Gateway-u
   ↓
5. API Gateway dobija JWT token sa /api/auth/login
   ↓
6. API Gateway šalje zahtev sa Authorization header-om
   ↓
7. API Gateway izvršava SQL upit na lokalnoj ERP bazi
   ↓
8. API Gateway vraća podatke u JSON formatu
   ↓
9. Cloud server prima podatke i sinkronizuje u PostgreSQL
   ↓
10. Admin vidi rezultat u UI-u
```

---

## 🔒 Sigurnost

1. **JWT Authentication** - Svi zahtevi moraju imati validan JWT token
2. **API Key** - Koristi se za dobijanje JWT tokena
3. **VPN** - API Gateway je dostupan samo preko Tailscale VPN-a
4. **Rate Limiting** - API Gateway ima rate limiting (100 zahteva/min)
5. **No Direct Access** - Cloud server nikada ne pristupa direktno SQL Server-u

---

## 📝 Napomene

- **Sve sync funkcije koriste API Gateway** - Nema direktnih SQL konekcija
- **JWT token se cache-uje** - Ne dobija se novi token za svaki zahtev
- **Error handling** - Svi error-i su pravilno obradjeni i logovani
- **Type safety** - Sve funkcije imaju TypeScript tipove

---

**Sve je već implementirano i radi preko API Gateway-a! 🎉**

