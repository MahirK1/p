# 📝 Changelog - API Gateway

## ✅ Ispravke i Poboljšanja

### Ispravljene Greške
- ✅ **SQL Upiti**: Ispravljena greška u nazivu baze podataka
  - Promenjeno: `ITAL_REGISTRI_IMELBISR_` → `ITAL_REGISTRI_IMELBIS_`
  - Lokacija: `server.js` - endpoints za klijente i podružnice
- ✅ **PM2 Ecosystem Config**: Ispravljena greška sa ES modules
  - Promenjeno: `ecosystem.config.js` → `ecosystem.config.cjs`
  - Razlog: PM2 zahteva CommonJS format za config fajl kada je `"type": "module"` u package.json

### Nova Dokumentacija
- ✅ **DEPLOYMENT_CLOUD.md**: Detaljne instrukcije za deployment na cloud server
- ✅ **QUICK_DEPLOY.md**: Brzi start vodič (10 minuta)
- ✅ **Docker Setup**: Dockerfile i docker-compose.yml za lakše deployment

### Nove Funkcionalnosti
- ✅ **generate-keys.js**: Skripta za generisanje sigurnih API_KEY i JWT_SECRET
- ✅ **Docker Support**: Docker kontejner za API Gateway

### Ažurirana Dokumentacija
- ✅ **README.md**: Dodati linkovi ka svim vodičima
- ✅ Dodate instrukcije za Docker deployment

---

## 🚀 Kako Koristiti

### 1. Brzi Start (10 minuta)
Pogledaj: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

### 2. Detaljne Instrukcije
Pogledaj: [DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md)

### 3. Generisanje Ključeva
```bash
npm run generate-keys
```

### 4. Docker Deployment
```bash
docker-compose up -d
```

---

## 📋 Checklist Pre Deployment-a

- [ ] SQL upiti ispravljeni
- [ ] `.env` fajl kreiran sa sigurnim ključevima
- [ ] API Gateway testiran lokalno
- [ ] VPN (Tailscale) instaliran i konfigurisan
- [ ] Cloud server `.env` ažuriran sa `ERP_API_GATEWAY_URL` i `ERP_API_KEY`
- [ ] Testiranje konekcije između cloud servera i API Gateway-a

---

## 🐛 Poznati Problemi

Nema poznatih problema.

---

## 📞 Podrška

Za dodatnu pomoć:
- Proveri [Troubleshooting sekciju](./DEPLOYMENT_CLOUD.md#-troubleshooting)
- Proveri logove: `pm2 logs erp-api-gateway`

