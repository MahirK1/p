# 🚀 API Gateway Deployment na Cloud Server

Ovaj vodič će vas provesti kroz proces postavljanja API Gateway servera na cloud server (77.77.207.36) koji će biti dostupan preko VPN-a za lokalnu ERP bazu.

## 📋 Pregled Arhitekture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Cloud Server   │  VPN    │  API Gateway     │  SQL    │  Lokalna ERP    │
│  (77.77.207.36) │◄───────►│  (Lokalna mreža) │◄───────►│  SQL Server     │
│                 │         │  (192.168.0.x)   │         │  (192.168.0.87) │
│  Next.js App    │         │  Port 3001       │         │  Port 1434      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Kako radi:**
1. Cloud server (Next.js app) šalje HTTP zahteve preko VPN-a ka API Gateway-u
2. API Gateway se nalazi na lokalnoj mreži i ima direktan pristup ERP SQL Server-u
3. API Gateway vraća podatke cloud serveru

---

## 🎯 Opcija 1: API Gateway na Lokalnoj Mreži (Preporučeno)

Ova opcija je najsigurnija jer ERP baza ostaje na lokalnoj mreži.

### Korak 1: Instalacija na Lokalni Računar (Windows)

#### 1.1 Preuzimanje i Instalacija Node.js
```powershell
# Preuzmi Node.js 18+ sa https://nodejs.org/
# Instaliraj Node.js
```

#### 1.2 Kloniranje ili Kopiranje Projekta
```powershell
# Ako koristiš Git:
cd C:\Users\pc\Desktop\Skrpite\PortalV2\api-gateway

# Ili jednostavno kopiraj api-gateway folder na lokalni računar
```

#### 1.3 Instalacija Dependencies
```powershell
cd api-gateway
npm install
```

**Napomena**: Ako dobiješ greške sa `mssql` modulom:
```powershell
npm install --global windows-build-tools
npm install
```

#### 1.4 Konfiguracija .env Fajla
```powershell
# Kopiraj env.example u .env
copy env.example .env
notepad .env
```

Ažuriraj sledeće vrednosti u `.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# API Security - GENERIŠI SIGURNE KLJUČEVE!
API_KEY=your-very-secure-api-key-change-this-in-production
JWT_SECRET=your-very-secure-jwt-secret-change-this-in-production
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

**VAŽNO**: Generiši sigurne ključeve:
```powershell
# Generiši API_KEY (koristi PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Ili koristi online generator: https://randomkeygen.com/
```

#### 1.5 Testiranje Lokalno
```powershell
# Pokreni server
npm start

# U drugom terminalu, testiraj:
curl http://localhost:3001/health
```

Trebalo bi da vidiš:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "service": "ERP API Gateway"
}
```

#### 1.6 Pokretanje sa PM2 (Production)
```powershell
# Instaliraj PM2 globalno
npm install -g pm2

# Pokreni sa PM2
pm2 start ecosystem.config.cjs

# Provera statusa
pm2 status

# Pregled logova
pm2 logs erp-api-gateway

# Automatski restart nakon Windows restart-a
pm2 startup
pm2 save
```

---

### Korak 2: VPN Setup (Tailscale - Najlakše)

#### 2.1 Instalacija Tailscale na Lokalni Računar
1. Preuzmi Tailscale sa: https://tailscale.com/download
2. Instaliraj i prijavi se
3. Zapiši Tailscale IP adresu (npr. `100.x.x.x`)

#### 2.2 Instalacija Tailscale na Cloud Server
```bash
# Na cloud serveru (Ubuntu/Linux)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Zapiši Tailscale IP adresu cloud servera
tailscale ip -4
```

#### 2.3 Testiranje VPN Konekcije
```bash
# Sa cloud servera, ping-uj lokalni računar
ping 100.x.x.x  # Tailscale IP lokalnog računara

# Testiraj API Gateway
curl http://100.x.x.x:3001/health
```

---

### Korak 3: Konfiguracija Cloud Servera

#### 3.1 Ažuriranje .env na Cloud Serveru
```bash
cd /var/www/portalv2
nano .env
```

Dodaj ili ažuriraj:
```env
# API Gateway Configuration
ERP_API_GATEWAY_URL=http://100.x.x.x:3001  # Tailscale IP lokalnog računara
ERP_API_KEY=your-very-secure-api-key-change-this-in-production  # ISTI KAO U API GATEWAY .env
ERP_JWT_SECRET=your-very-secure-jwt-secret-change-this-in-production  # ISTI KAO U API GATEWAY .env (opciono)
```

**VAŽNO**: `ERP_API_KEY` i `ERP_JWT_SECRET` moraju biti **ISTI** kao u API Gateway `.env` fajlu!

#### 3.2 Testiranje Konekcije sa Cloud Servera
```bash
# Testiraj API Gateway konekciju
curl http://100.x.x.x:3001/health

# Testiraj autentikaciju (zameni API_KEY)
curl -X POST http://100.x.x.x:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-very-secure-api-key-change-this-in-production"}'
```

Trebalo bi da dobiješ JWT token.

#### 3.3 Restart Next.js Aplikacije
```bash
pm2 restart portalv2
pm2 logs portalv2
```

---

## 🎯 Opcija 2: API Gateway na Cloud Serveru (Ako ERP Baza Nije na Lokalnoj Mreži)

Ako vaša ERP baza nije na lokalnoj mreži ili želite da API Gateway bude na cloud serveru:

### Korak 1: Upload API Gateway na Cloud Server

```bash
# Na cloud serveru
cd /var/www
mkdir -p api-gateway
cd api-gateway

# Upload fajlova (koristi SCP sa lokalnog računara)
# Sa lokalnog računara:
scp -r api-gateway/* username@77.77.207.36:/var/www/api-gateway/
```

### Korak 2: Instalacija i Konfiguracija

```bash
cd /var/www/api-gateway
npm install

# Kreiraj .env fajl
cp env.example .env
nano .env
```

Ažuriraj `.env`:
```env
PORT=3001
NODE_ENV=production
API_KEY=your-very-secure-api-key-change-this-in-production
JWT_SECRET=your-very-secure-jwt-secret-change-this-in-production
JWT_EXPIRES_IN=24h

# ERP Database Configuration
ERP_DB_SERVER=your-erp-server-ip\SQLEXPRESS
ERP_DB_PORT=1434
ERP_DB_NAME=ITAL_REGISTRI_IMELBIS_
ERP_DB_USER=sa
ERP_DB_PASSWORD=your-password-here
ERP_DB_ENCRYPT=false
ERP_DB_TRUST_CERT=true

ERP_LAGER_TABLE=ITAL_IMELBIS_2025
```

### Korak 3: Pokretanje sa PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Korak 4: Konfiguracija Nginx (Opciono)

Ako želiš da API Gateway bude dostupan preko Nginx-a:

```bash
sudo nano /etc/nginx/sites-available/api-gateway
```

Dodaj:
```nginx
server {
    listen 80;
    server_name api-gateway.yourdomain.com;  # ili IP adresa

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Korak 5: Ažuriranje Next.js .env

```env
ERP_API_GATEWAY_URL=http://localhost:3001  # Ili http://api-gateway.yourdomain.com
ERP_API_KEY=your-very-secure-api-key-change-this-in-production
```

---

## 🔒 Sigurnost

### Firewall Konfiguracija

#### Na Lokalnom Računaru (Windows)
```powershell
# Dozvoli port 3001 u Windows Firewall
New-NetFirewallRule -DisplayName "API Gateway" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

#### Na Cloud Serveru (Ubuntu)
```bash
# Dozvoli port 3001 (samo ako API Gateway je na cloud serveru)
sudo ufw allow 3001/tcp
```

### Best Practices

1. **Nikad ne eksponuj API Gateway direktno na internet** - koristi VPN
2. **Koristi jak API_KEY** - minimum 32 karaktera, random
3. **Koristi jak JWT_SECRET** - minimum 32 karaktera, random
4. **Rotiraj ključeve redovno** - svakih 3-6 meseci
5. **Koristi HTTPS** - ako API Gateway mora biti dostupan preko interneta, koristi SSL

---

## 🧪 Testiranje

### Test 1: Health Check
```bash
curl http://100.x.x.x:3001/health
```

### Test 2: Autentikacija
```bash
curl -X POST http://100.x.x.x:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}'
```

### Test 3: Test Konekcije sa Bazom
```bash
# Prvo dobij token
TOKEN=$(curl -s -X POST http://100.x.x.x:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}' | jq -r '.token')

# Testiraj konekciju
curl http://100.x.x.x:3001/api/test \
  -H "Authorization: Bearer $TOKEN"
```

### Test 4: Dohvatanje Proizvoda
```bash
curl http://100.x.x.x:3001/api/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### Problem: "Connection refused" sa cloud servera
**Rešenje:**
1. Proveri da li je API Gateway pokrenut: `pm2 status`
2. Proveri da li port 3001 sluša: `netstat -an | grep 3001`
3. Proveri firewall na lokalnom računaru
4. Proveri VPN konekciju: `ping 100.x.x.x`

### Problem: "Invalid API Key"
**Rešenje:**
1. Proveri da li je `API_KEY` isti u oba `.env` fajla (API Gateway i Cloud Server)
2. Proveri da li nema razmaka ili specijalnih karaktera
3. Restart oba servera nakon promene `.env`

### Problem: "SQL Server connection error"
**Rešenje:**
1. Proveri da li je SQL Server pokrenut
2. Proveri da li je SQL Server konfigurisan da prihvata TCP/IP konekcije
3. Proveri SQL Server autentikaciju (Windows Auth vs SQL Auth)
4. Proveri firewall na SQL Server računaru
5. Testiraj konekciju direktno sa SQL Server Management Studio

### Problem: "JWT token expired"
**Rešenje:**
- Token se automatski obnavlja u `erp-db.ts`
- Proveri da li je `JWT_EXPIRES_IN` postavljen ispravno
- Proveri da li su `JWT_SECRET` isti u oba `.env` fajla

---

## 📊 Monitoring

### PM2 Monitoring
```bash
# Pregled statusa
pm2 status

# Pregled logova
pm2 logs erp-api-gateway

# Pregled resursa
pm2 monit
```

### Log Fajlovi
```bash
# API Gateway logovi
tail -f /var/www/api-gateway/logs/out.log
tail -f /var/www/api-gateway/logs/err.log
```

---

## ✅ Checklist za Deployment

- [ ] Node.js instaliran na lokalnom računaru
- [ ] API Gateway dependencies instalirane
- [ ] `.env` fajl kreiran sa sigurnim ključevima
- [ ] API Gateway testiran lokalno (`/health` endpoint)
- [ ] PM2 pokrenuo API Gateway
- [ ] VPN (Tailscale) instaliran i konfigurisan
- [ ] VPN konekcija testirana između cloud servera i lokalnog računara
- [ ] Firewall dozvoljava port 3001
- [ ] Cloud server `.env` ažuriran sa `ERP_API_GATEWAY_URL` i `ERP_API_KEY`
- [ ] Testiranje autentikacije sa cloud servera
- [ ] Testiranje dohvatanja proizvoda/klijenata
- [ ] Next.js aplikacija restart-ovana

---

## 🎉 Gotovo!

Sada bi API Gateway trebalo da radi i cloud server bi trebalo da može da pristupa ERP bazi preko VPN-a!

Za dodatnu pomoć:
- API Gateway logovi: `pm2 logs erp-api-gateway`
- Cloud server logovi: `pm2 logs portalv2`
- VPN status: `tailscale status`

