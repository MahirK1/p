# 🔧 Popravka: "Failed to connect to :1433" Greška

## Problem

Ako vidiš grešku:
```
Failed to connect to :1433 - Could not connect (sequence)
```

To znači da **environment varijable nisu postavljene** na cloud serveru!

---

## ✅ Rešenje (2 minuta)

### Korak 1: Proveri .env fajl na Cloud Serveru

```bash
cd /var/www/portalv2
cat .env | grep ERP
```

**Ako ne vidiš `ERP_API_GATEWAY_URL` i `ERP_API_KEY`, dodaj ih!**

### Korak 2: Dodaj Environment Varijable

```bash
nano .env
```

**Dodaj ove linije (zameni sa tvojim vrednostima):**

```env
# API Gateway Configuration
ERP_API_GATEWAY_URL=http://100.78.79.7:3001
ERP_API_KEY=ISTI_KAO_U_API_GATEWAY_ENV
```

**VAŽNO:**
- `ERP_API_GATEWAY_URL` - Tailscale IP adresa lokalnog računara (npr. `100.78.79.7`)
- `ERP_API_KEY` - **ISTI** kao u `api-gateway/.env` na lokalnom računaru

### Korak 3: Proveri API Key na Lokalnom Računaru

```powershell
# Na lokalnom računaru
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway
type .env | findstr API_KEY
```

**Kopiraj `API_KEY` vrednost i koristi je u cloud server `.env` fajlu!**

### Korak 4: Restart Aplikacije

```bash
# Na cloud serveru
pm2 restart portalv2
pm2 logs portalv2 --lines 50
```

---

## ✅ Provera da li radi

```bash
# Testiraj API Gateway konekciju
curl http://100.78.79.7:3001/health

# Trebalo bi da vidiš: {"status":"ok",...}
```

---

## 🐛 Ako i dalje ne radi

### Problem: "Connection refused"
```bash
# Proveri da li API Gateway radi na lokalnom računaru
# Na lokalnom računaru:
pm2 status
```

### Problem: "Invalid API Key"
- Proveri da li je `ERP_API_KEY` **ISTI** u oba `.env` fajla
- Proveri da li nema razmaka ili specijalnih karaktera

### Problem: Environment varijable se ne učitavaju
```bash
# Proveri da li .env fajl postoji
ls -la /var/www/portalv2/.env

# Proveri da li PM2 koristi .env fajl
pm2 env 0 | grep ERP
```

---

## 📝 Checklist

- [ ] `.env` fajl postoji na cloud serveru
- [ ] `ERP_API_GATEWAY_URL` je postavljen sa Tailscale IP
- [ ] `ERP_API_KEY` je postavljen i isti kao u `api-gateway/.env`
- [ ] Aplikacija je restart-ovana (`pm2 restart portalv2`)
- [ ] API Gateway radi na lokalnom računaru
- [ ] Tailscale VPN konekcija radi

---

**To je sve! 🎉**

