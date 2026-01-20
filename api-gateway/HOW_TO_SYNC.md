# 🔄 Kako da Pokreneš Sinkronizaciju Proizvoda

Postoji nekoliko načina da pokreneš sinkronizaciju proizvoda iz ERP baze:

---

## 1️⃣ Preko Admin Panela (Najlakše) ⭐

### Korak 1: Prijavi se kao Admin
- Otvori aplikaciju u browser-u
- Prijavi se sa admin nalogom

### Korak 2: Idi na Products stranicu
- Klikni na **"Lager proizvoda"** u admin panelu
- Ili direktno: `http://tvoj-server/dashboard/admin/products`

### Korak 3: Klikni na "Sinkronizuj iz ERP"
- Na vrhu stranice, klikni na zeleno dugme **"Sinkronizuj iz ERP"**
- Sinkronizacija će početi automatski
- Videćeš poruku kada završi

---

## 2️⃣ Preko API Endpoint-a (Za Testiranje)

### Sa Cloud Servera (SSH)

```bash
# Testiraj da li endpoint radi
curl -X GET http://localhost:3000/api/sync/products \
  -H "Cookie: next-auth.session-token=TVOJ_SESSION_TOKEN"
```

**Ili koristi POST sa API key:**

```bash
# Postavi SYNC_API_KEY u .env fajlu
# Zatim:
curl -X POST http://localhost:3000/api/sync/products \
  -H "x-api-key: TVOJ_SYNC_API_KEY"
```

### Iz Browser-a (Developer Console)

```javascript
// Otvori Developer Console (F12) i pokreni:
fetch('/api/sync/products', {
  method: 'GET',
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

---

## 3️⃣ Preko Cron Job-a (Automatski)

Ako imaš postavljen cron job, sinkronizacija se pokreće automatski.

### Provera Cron Job-a

```bash
# Proveri da li cron job radi
pm2 logs portalv2 | grep sync
```

### Ručno Pokretanje Cron Job-a

```bash
# Pozovi cron endpoint direktno
curl -X GET http://localhost:3000/api/cron/sync-products
```

---

## 4️⃣ Preko Terminala (Node.js Script)

Kreiraj skriptu `scripts/sync-products.cjs`:

```javascript
const { syncProducts } = require('../src/lib/sync-products');

async function main() {
  try {
    console.log('🔄 Počinje sinkronizacija...');
    const result = await syncProducts();
    console.log('✅ Sinkronizacija završena:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Greška:', error);
    process.exit(1);
  }
}

main();
```

**Pokreni:**
```bash
node scripts/sync-products.cjs
```

---

## 🐛 Troubleshooting

### Problem: "Forbidden" ili "Unauthorized"
**Rešenje:**
- Proveri da li si prijavljen kao ADMIN
- Proveri da li session token nije istekao

### Problem: "Failed to connect to API Gateway"
**Rešenje:**
1. Proveri da li je `ERP_API_GATEWAY_URL` postavljen u `.env`
2. Proveri da li API Gateway radi na lokalnom računaru
3. Proveri Tailscale VPN konekciju

### Problem: "Invalid API Key"
**Rešenje:**
- Proveri da li je `ERP_API_KEY` isti u oba `.env` fajla
- Restart aplikacije nakon promene `.env`

---

## ✅ Provera da li je Sinkronizacija Uspešna

### Preko Admin Panela
- Videćeš toast poruku sa rezultatom
- Proveri da li se proizvodi pojavljuju u tabeli

### Preko Logova
```bash
# Na cloud serveru
pm2 logs portalv2 | grep -i sync

# Trebalo bi da vidiš:
# ✅ Sinkronizacija završena: X kreirano, Y ažurirano
```

---

## 📊 Rezultat Sinkronizacije

Sinkronizacija vraća:
```json
{
  "success": true,
  "stats": {
    "total": 1000,
    "created": 50,
    "updated": 950,
    "errors": 0
  }
}
```

---

**Najlakši način:** Koristi admin panel - klikni na "Sinkronizuj iz ERP" dugme! 🎉

