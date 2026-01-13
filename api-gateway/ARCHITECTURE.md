# 🏗️ Arhitektura Sistema

## Pregled Arhitekture

```
┌─────────────────────────────────┐
│   ERP SQL Server (Windows 10)   │
│   192.168.0.87\SQLEXPRESS       │
│   Port: 1434                    │
└──────────────┬──────────────────┘
               │ Lokalna LAN mreža
               ↓
┌─────────────────────────────────┐
│  Local Sync Agent (Windows 11)  │
│  API Gateway Server             │
│  Port: 3001                     │
│  - Node.js / Express            │
│  - JWT Authentication            │
│  - Rate Limiting                │
└──────────────┬──────────────────┘
               │ HTTPS (JWT)
               ↓ VPN (Tailscale/WireGuard)
┌─────────────────────────────────┐
│      Cloud API (Ubuntu)         │
│      77.77.207.36               │
│      - Next.js App              │
│      - PostgreSQL Database      │
└─────────────────────────────────┘
```

## Komunikacioni Protokoli

### 1. SQL Server → API Gateway
- **Protokol**: TCP/IP (SQL Server)
- **Port**: 1434
- **Autentikacija**: SQL Server Authentication
- **Mreža**: Lokalna LAN (192.168.0.x)

### 2. API Gateway → Cloud API
- **Protokol**: HTTPS (preporučeno) ili HTTP
- **Port**: 3001 (API Gateway), 3000 (Cloud API)
- **Autentikacija**: JWT (JSON Web Token)
- **Mreža**: VPN (Tailscale/WireGuard)

## Autentikacija Flow

### JWT Token Flow

1. **Cloud API** šalje API Key ka **API Gateway**:
   ```
   POST /api/auth/login
   Body: { "apiKey": "your-api-key" }
   ```

2. **API Gateway** verifikuje API Key i generiše JWT token:
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiresIn": "24h"
   }
   ```

3. **Cloud API** koristi JWT token za sve naredne zahteve:
   ```
   GET /api/products
   Headers: Authorization: Bearer <jwt-token>
   ```

4. **API Gateway** verifikuje JWT token i izvršava zahtev

## Sigurnosne Karakteristike

### API Gateway (Windows 11)
- ✅ JWT autentikacija
- ✅ Rate limiting (100 req/min)
- ✅ CORS zaštita
- ✅ SQL injection zaštita (parametrizovani upiti)
- ✅ Error handling

### Cloud API (Ubuntu)
- ✅ JWT token caching (automatski refresh)
- ✅ HTTPS komunikacija (preko Nginx)
- ✅ NextAuth za korisničku autentikaciju
- ✅ PostgreSQL zaštita

## Portovi

| Servis | Port | Protokol | Opis |
|--------|------|----------|------|
| SQL Server | 1434 | TCP | ERP baza podataka |
| API Gateway | 3001 | HTTP/HTTPS | Local Sync Agent |
| Cloud API | 3000 | HTTP | Next.js aplikacija |
| Nginx | 80/443 | HTTP/HTTPS | Reverse proxy |

## Environment Varijable

### API Gateway (.env)
```env
PORT=3001
API_KEY=...
JWT_SECRET=...
JWT_EXPIRES_IN=24h
ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
ERP_DB_PORT=1434
ERP_DB_NAME=...
ERP_DB_USER=...
ERP_DB_PASSWORD=...
```

### Cloud API (.env)
```env
ERP_API_GATEWAY_URL=http://100.x.x.x:3001
ERP_API_KEY=...
ERP_JWT_SECRET=... (opciono)
```

## Data Flow

### Sinkronizacija Proizvoda

1. Admin klikne "Sinkronizuj iz ERP" na Cloud API
2. Cloud API poziva `getErpProducts()` iz `erp-db.ts`
3. `erp-db.ts` dobija JWT token (ili koristi cached)
4. HTTP GET zahtev ka API Gateway: `/api/products`
5. API Gateway verifikuje JWT token
6. API Gateway izvršava SQL upit na SQL Server
7. API Gateway vraća JSON sa proizvodima
8. Cloud API ažurira PostgreSQL bazu

### Sinkronizacija Klijenata

Isti flow kao proizvodi, samo sa `/api/clients` endpoint-om.

## Troubleshooting

### Problem: JWT Token Expired
- **Rešenje**: Cloud API automatski dobija novi token kada stari istekne

### Problem: Cannot connect to SQL Server
- **Proveri**: Port 1434 je otvoren u Windows Firewall-u
- **Proveri**: SQL Server TCP/IP protokol je omogućen

### Problem: VPN Connection Failed
- **Proveri**: Tailscale/WireGuard je aktivan na oba računara
- **Proveri**: Ping između računara radi

