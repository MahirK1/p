# ✅ Testiranje Konekcije - Korak po Korak

## 🎯 Šta Trebaš da Uradiš (5 minuta)

### 1. Na Lokalnom Računaru (Windows)

#### 1.1 Proveri Tailscale IP
```powershell
# Otvori Tailscale aplikaciju i vidi IP adresu
# Ili u PowerShell:
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "100.*"}
```

**Zapiši ovu IP adresu:** `_________________` (npr. 100.64.1.2)

#### 1.2 Proveri da li API Gateway radi
```powershell
# Otvori PowerShell u api-gateway folderu
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway

# Proveri status
pm2 status

# Ako ne radi, pokreni:
pm2 start ecosystem.config.cjs
```

#### 1.3 Testiraj lokalno
```powershell
# Testiraj da li server radi
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing
```

Trebalo bi da vidiš: `{"status":"ok",...}`

---

### 2. Na Cloud Serveru (Ubuntu/Linux)

#### 2.1 Proveri Tailscale IP
```bash
# Proveri da li je Tailscale aktivan
tailscale status

# Vidi svoju IP adresu
tailscale ip -4
```

**Zapiši cloud server IP:** `_________________`

#### 2.2 Testiraj Konekciju ka Lokalnom Računaru

**Zameni `100.x.x.x` sa IP adresom tvog lokalnog računara:**

```bash
# Test 1: Ping lokalni računar
ping -c 3 100.x.x.x

# Test 2: Testiraj API Gateway health endpoint
curl http://100.x.x.x:3001/health
```

**Ako vidiš `{"status":"ok"}`, konekcija radi! ✅**

---

### 3. Konfiguracija Cloud Servera

#### 3.1 Otvori .env fajl
```bash
cd /var/www/portalv2
nano .env
```

#### 3.2 Dodaj ili Ažuriraj (Zameni `100.x.x.x` sa IP adresom lokalnog računara):

```env
ERP_API_GATEWAY_URL=http://100.x.x.x:3001
ERP_API_KEY=ISTI_KAO_U_API_GATEWAY_ENV
ERP_JWT_SECRET=ISTI_KAO_U_API_GATEWAY_ENV
```

**VAŽNO:** 
- `ERP_API_KEY` mora biti **ISTI** kao u `api-gateway/.env` fajlu na lokalnom računaru
- `ERP_JWT_SECRET` mora biti **ISTI** kao u `api-gateway/.env` fajlu na lokalnom računaru

#### 3.3 Restart Aplikacije
```bash
pm2 restart portalv2
pm2 logs portalv2 --lines 20
```

---

## 🐛 Ako Ne Radi

### Problem: "Connection refused"
**Rešenje:**
1. Proveri da li je API Gateway pokrenut na lokalnom računaru: `pm2 status`
2. Proveri Windows Firewall - dozvoli port 3001:
```powershell
New-NetFirewallRule -DisplayName "API Gateway" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Problem: "Ping ne radi"
**Rešenje:**
1. Proveri da li su oba računara prijavljena u Tailscale
2. Proveri: `tailscale status` na oba računara
3. Proveri da li su u istoj Tailscale mreži

### Problem: "Invalid API Key"
**Rešenje:**
1. Proveri da li je `ERP_API_KEY` isti u oba `.env` fajla
2. Proveri da li nema razmaka ili specijalnih karaktera
3. Restart oba servera nakon promene `.env`

---

## ✅ Checklist

- [ ] Tailscale instaliran na lokalnom računaru
- [ ] Tailscale instaliran na cloud serveru
- [ ] API Gateway radi na lokalnom računaru (`pm2 status`)
- [ ] Ping radi sa cloud servera ka lokalnom računaru
- [ ] `curl http://100.x.x.x:3001/health` radi sa cloud servera
- [ ] `.env` na cloud serveru ima `ERP_API_GATEWAY_URL` sa Tailscale IP
- [ ] `ERP_API_KEY` je isti u oba `.env` fajla
- [ ] Next.js aplikacija restart-ovana na cloud serveru

---

## 🎉 Gotovo!

Ako sve radi, trebalo bi da vidiš:
- ✅ Health check vraća `{"status":"ok"}`
- ✅ Next.js aplikacija može da pristupa ERP podacima

