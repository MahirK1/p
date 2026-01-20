# 🔧 Setup .env Fajla za Cloud Server

## 📋 Korak po Korak

### 1. Na Lokalnom Računaru - Priprema Podataka

#### 1.1 Proveri Tailscale IP
```powershell
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway
.\get-tailscale-ip.ps1
```

**Zapiši IP adresu:** `_________________` (npr. 100.78.79.7)

#### 1.2 Proveri API Key
```powershell
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway
type .env | findstr API_KEY
```

**Kopiraj API_KEY vrednost:** `_________________`

---

### 2. Na Cloud Serveru - Kreiranje .env Fajla

#### 2.1 Kopiraj Template
```bash
cd /var/www/portalv2
cp env.example.cloud .env
nano .env
```

#### 2.2 Ažuriraj Sledeće Vrednosti

**VAŽNO - API Gateway Configuration:**
```env
# Zameni 100.78.79.7 sa tvojom Tailscale IP adresom
ERP_API_GATEWAY_URL=http://100.78.79.7:3001

# Kopiraj API_KEY iz api-gateway/.env fajla (MORA BITI ISTI!)
ERP_API_KEY=isti-kao-u-api-gateway-env
```

**Database:**
```env
# Zameni sa tvojom PostgreSQL konekcijom
PRISMA_DB_URL=postgresql://portalv2_user:TVOJA_LOZINKA@localhost:5432/portalv2?schema=public
```

**NextAuth:**
```env
# Generiši sa: openssl rand -base64 32
NEXTAUTH_SECRET=generisi-novu-vrednost-ovde

# Zameni sa tvojom IP adresom ili domain-om
NEXTAUTH_URL=http://77.77.207.36
NEXT_PUBLIC_CLIENT_ORIGIN=http://77.77.207.36
```

---

### 3. Generisanje NEXTAUTH_SECRET

```bash
# Na cloud serveru
openssl rand -base64 32
```

Kopiraj rezultat i stavi ga u `.env` fajl kao `NEXTAUTH_SECRET`.

---

### 4. Provera

#### 4.1 Proveri da li su sve varijable postavljene
```bash
cat .env | grep -E "ERP_API_GATEWAY_URL|ERP_API_KEY|PRISMA_DB_URL|NEXTAUTH_SECRET"
```

#### 4.2 Testiraj API Gateway konekciju
```bash
# Zameni 100.78.79.7 sa tvojom Tailscale IP
curl http://100.78.79.7:3001/health
```

Trebalo bi da vidiš: `{"status":"ok",...}`

---

### 5. Restart Aplikacije

```bash
pm2 restart portalv2
pm2 logs portalv2 --lines 50
```

---

## ✅ Checklist

- [ ] Tailscale IP adresa proverena i zabeležena
- [ ] API_KEY kopiran iz `api-gateway/.env`
- [ ] `.env` fajl kreiran na cloud serveru
- [ ] `ERP_API_GATEWAY_URL` postavljen sa Tailscale IP
- [ ] `ERP_API_KEY` postavljen i isti kao u `api-gateway/.env`
- [ ] `PRISMA_DB_URL` postavljen sa PostgreSQL konekcijom
- [ ] `NEXTAUTH_SECRET` generisan i postavljen
- [ ] `NEXTAUTH_URL` i `NEXT_PUBLIC_CLIENT_ORIGIN` postavljeni
- [ ] API Gateway testiran (`curl http://100.78.79.7:3001/health`)
- [ ] Aplikacija restart-ovana

---

## 🐛 Troubleshooting

### Problem: "ERP_API_KEY nije postavljen"
**Rešenje:** Proveri da li je `ERP_API_KEY` postavljen u `.env` fajlu

### Problem: "ERP_API_GATEWAY_URL nije postavljen"
**Rešenje:** Proveri da li je `ERP_API_GATEWAY_URL` postavljen sa Tailscale IP

### Problem: "Invalid API Key"
**Rešenje:** Proveri da li je `ERP_API_KEY` **ISTI** u oba `.env` fajla (cloud server i api-gateway)

### Problem: "Connection refused"
**Rešenje:** 
1. Proveri da li API Gateway radi: `pm2 status` (na lokalnom računaru)
2. Proveri Tailscale VPN konekciju
3. Proveri firewall na lokalnom računaru

---

## 📝 Template Fajl

Koristi `env.example.cloud` kao template. Kopiraj ga u `.env` i ažuriraj vrednosti.

---

**Gotovo! 🎉**

