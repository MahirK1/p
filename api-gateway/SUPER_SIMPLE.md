# 🚀 Super Jednostavan Vodič - 3 Koraka

Ako si već uvezao Tailscale, ovo je sve što trebaš da uradiš:

---

## ✅ Korak 1: Na Lokalnom Računaru (2 minuta)

### 1.1 Proveri Tailscale IP

**Najlakše - koristi skriptu:**
```powershell
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway
.\get-tailscale-ip.ps1
```

**Ili ručno:**
- Otvori Tailscale aplikaciju i vidi IP adresu (npr. `100.78.79.7`)

**Zapiši IP:** `_________________`

### 1.2 Proveri da li API Gateway radi
```powershell
pm2 status
```

Ako ne radi:
```powershell
pm2 start ecosystem.config.cjs
```

---

## ✅ Korak 2: Na Cloud Serveru (2 minuta)

### 2.1 Testiraj konekciju

**Zameni `100.x.x.x` sa IP adresom iz Koraka 1:**

```bash
# Test 1: Ping
ping -c 3 100.x.x.x

# Test 2: API Gateway
curl http://100.x.x.x:3001/health
```

**Ako vidiš `{"status":"ok"}`, radi! ✅**

**Ili koristi skriptu:**
```bash
cd /var/www/portalv2
bash api-gateway/test-connection.sh 100.x.x.x
```

---

## ✅ Korak 3: Konfiguracija (1 minut)

### 3.1 Otvori .env fajl
```bash
cd /var/www/portalv2
nano .env
```

### 3.2 Dodaj ove linije (zameni `100.x.x.x` sa IP adresom):

```env
ERP_API_GATEWAY_URL=http://100.x.x.x:3001
ERP_API_KEY=ISTI_KAO_U_API_GATEWAY_ENV
```

**VAŽNO:** `ERP_API_KEY` mora biti **ISTI** kao u `api-gateway/.env` na lokalnom računaru!

### 3.3 Restart
```bash
pm2 restart portalv2
```

---

## 🎉 Gotovo!

Ako sve radi, trebalo bi da vidiš podatke iz ERP baze u Next.js aplikaciji!

---

## 🐛 Ako Ne Radi

### Problem: "Connection refused"
```powershell
# Na lokalnom računaru, dozvoli port u firewall-u:
New-NetFirewallRule -DisplayName "API Gateway" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Problem: "Invalid API Key"
- Proveri da li je `ERP_API_KEY` isti u oba `.env` fajla
- Restart oba servera

### Problem: Ping ne radi
- Proveri da li su oba računara prijavljena u Tailscale
- Proveri: `tailscale status` na oba računara

---

**To je sve! 🎉**

