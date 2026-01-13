# 🔐 API Gateway Setup - Povezivanje Cloud Servera sa Lokalnom ERP Bazom

Ovaj vodič će vam pokazati kako da postavite API Gateway server koji omogućava cloud serveru pristup lokalnoj ERP bazi.

## 📋 Pregled Arhitekture

```
Cloud Server (Ubuntu - 77.77.207.36)
    ↓ (VPN konekcija - Tailscale/WireGuard)
API Gateway Server (Windows 11 - na lokalnoj mreži)
    ↓ (lokalna LAN konekcija)
SQL Server (Windows 10 - 192.168.0.87\SQLEXPRESS)
```

**Napomena**: 
- API Gateway server radi na **Windows 11** računaru
- SQL Server je na **Windows 10** računaru (192.168.0.87)
- Cloud server je **Ubuntu**

## 🚀 KORAK 1: Setup API Gateway Servera na Lokalnoj Mreži

**NAPOMENA**: API Gateway server će biti pokrenut na **Windows 11** računaru koji ima pristup SQL Server-u (Windows 10).

**📖 Za detaljne Windows 11 specifične instrukcije, pogledaj: `api-gateway/WINDOWS_SETUP.md`**

### 1.1 Instalacija Node.js na Windows 11

**Na Windows 11 računaru:**

1. **Preuzmi Node.js:**
   - Idite na: https://nodejs.org/
   - Preuzmite **LTS verziju** (preporučeno 18.x ili 20.x)
   - Instaliraj preuzeti `.msi` fajl

2. **Proveri instalaciju:**
   - Otvori **PowerShell** ili **Command Prompt** kao Administrator
   ```powershell
   node --version
   npm --version
   ```

3. **Ako nisu instalirani, dodaj Node.js u PATH:**
   - Node.js bi trebao automatski da se doda u PATH tokom instalacije

### 1.2 Kopiranje API Gateway Projekta na Windows 11

**Na Windows 11 računaru:**

1. **Kreiraj folder za API Gateway:**
   ```powershell
   # U PowerShell-u ili Command Prompt-u
   mkdir C:\erp-api-gateway
   cd C:\erp-api-gateway
   ```

2. **Kopiraj fajlove:**
   - Kopiraj ceo `api-gateway` folder iz projekta u `C:\erp-api-gateway`
   - Ili koristi Git:
   ```powershell
   git clone <your-repo-url>
   cd PortalV2/api-gateway
   ```

### 1.3 Instalacija Dependencies na Windows 11

**Na Windows 11 računaru:**

```powershell
# Navigiraj u api-gateway folder
cd C:\erp-api-gateway

# Instaliraj dependencies
npm install
```

**Napomena**: Ako dobiješ greške sa native modulima (mssql), možda treba da instaliraš:
```powershell
npm install --global windows-build-tools
# ili
npm install --global node-gyp
```

### 1.4 Konfiguracija na Windows 11

**Na Windows 11 računaru:**

1. **Kopiraj env.example u .env:**
   ```powershell
   # U PowerShell-u
   Copy-Item env.example .env
   
   # Ili u Command Prompt-u
   copy env.example .env
   ```

2. **Uredi .env fajl:**
   - Otvori `.env` fajl u Notepad-u ili bilo kojem text editoru:
   ```powershell
   notepad .env
   ```
   
   **VAŽNO za Windows**: U `.env` fajlu, za `ERP_DB_SERVER` koristi **backslash escape**:
   ```env
   ERP_DB_SERVER=192.168.0.87\\SQLEXPRESS
   # ili jednostavno bez escape-a u .env fajlu:
   ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
   ```

Ažuriraj sledeće vrednosti:

```env
PORT=3001
API_KEY=generisi-siguran-api-kljuc-ovde
JWT_SECRET=generisi-siguran-jwt-secret-ovde
JWT_EXPIRES_IN=24h

# ERP Database
ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
ERP_DB_PORT=1434
ERP_DB_NAME=ITAL_REGISTRI_IMELBIS_
ERP_DB_USER=sa
ERP_DB_PASSWORD=tvoja-lozinka-ovde
ERP_DB_ENCRYPT=false
ERP_DB_TRUST_CERT=true

# ERP Table
ERP_LAGER_TABLE=ITAL_IMELBIS_2025
```

**VAŽNO**: Generiši siguran API ključ:

**Na Windows 11:**
```powershell
# Opcija 1: Koristi PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Opcija 2: Koristi Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opcija 3: Online generator
# Idite na: https://www.lastpass.com/features/password-generator
```

**Na Cloud Serveru (Ubuntu):**
```bash
openssl rand -base64 32
```

**VAŽNO**: API_KEY mora biti **identičan** u oba `.env` fajla (Windows 11 i Cloud Server)!

### 1.5 Testiranje API Gateway Servera na Windows 11

**Na Windows 11 računaru:**

1. **Pokreni server:**
   ```powershell
   npm start
   ```

2. **U drugom PowerShell prozoru, testiraj:**

   **Opcija 1: Koristi PowerShell Invoke-WebRequest:**
   ```powershell
   # Health check
   Invoke-WebRequest -Uri http://localhost:3001/health
   
   # Test sa API key-jem
   $headers = @{ "X-API-Key" = "your-api-key" }
   Invoke-WebRequest -Uri http://localhost:3001/api/test -Headers $headers
   ```

   **Opcija 2: Instaliraj curl za Windows:**
   ```powershell
   # Preuzmi sa: https://curl.se/windows/
   # Ili koristi winget (Windows 11):
   winget install cURL.cURL
   
   # Zatim koristi curl:
   curl http://localhost:3001/health
   curl -H "X-API-Key: your-api-key" http://localhost:3001/api/test
   ```

   **Opcija 3: Koristi browser:**
   - Otvori browser i idite na: `http://localhost:3001/health`

### 1.6 Pokretanje kao Windows Service (Production)

**Na Windows 11 računaru:**

**Opcija A: PM2 za Windows (Preporučeno)**

1. **Instaliraj PM2:**
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

2. **Pokreni API Gateway sa PM2:**
   ```powershell
   cd C:\erp-api-gateway
   pm2 start server.js --name erp-api-gateway
   pm2 save
   ```

3. **Omogući auto-start nakon Windows restart-a:**
   ```powershell
   pm2-startup install
   ```

**Opcija B: NSSM (Non-Sucking Service Manager) - Alternativa**

1. **Preuzmi NSSM:**
   - Idite na: https://nssm.cc/download
   - Preuzmi najnoviju verziju za Windows 64-bit

2. **Instaliraj kao Windows Service:**
   ```powershell
   # Ekstraktuj NSSM u folder (npr. C:\nssm)
   cd C:\nssm\win64
   
   # Instaliraj servis
   .\nssm.exe install ERP-API-Gateway
   ```
   
   U NSSM GUI-u unesi:
   - **Path**: `C:\Program Files\nodejs\node.exe`
   - **Startup directory**: `C:\erp-api-gateway`
   - **Arguments**: `server.js`

3. **Pokreni servis:**
   ```powershell
   .\nssm.exe start ERP-API-Gateway
   ```

**Opcija C: Windows Task Scheduler**

1. Otvori **Task Scheduler** (raspoređivač zadataka)
2. Kreiram novi zadatak:
   - **Trigger**: "At startup"
   - **Action**: Start a program
   - **Program**: `C:\Program Files\nodejs\node.exe`
   - **Arguments**: `C:\erp-api-gateway\server.js`
   - **Start in**: `C:\erp-api-gateway`

---

## 🔒 KORAK 2: VPN Setup (WireGuard ili Tailscale)

### Opcija A: Tailscale (Najlakše - Preporučeno)

**Na Windows 11 računaru (API Gateway):**

1. **Preuzmi Tailscale:**
   - Idite na: https://tailscale.com/download
   - Preuzmi Tailscale za Windows
   - Instaliraj preuzeti installer

2. **Prijavi se:**
   - Klikni na Tailscale ikonu u system tray-u
   - Klikni "Log in"
   - Pratite link da se prijavite sa Google, Microsoft, ili GitHub account-om

3. **Proveri IP adresu:**
   - Desni klik na Tailscale ikonu → "IP addresses"
   - Zapamti **Tailscale IP adresu** (npr. `100.x.x.x`)

**Na Cloud Serveru (Ubuntu):**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Isti link/account kao na Windows-u
```

**Zapamti Tailscale IP adresu** Windows 11 računara (npr. `100.x.x.x`)

### Opcija B: WireGuard VPN

Pratite detaljne instrukcije iz prethodnog vodiča za WireGuard setup.

---

## ☁️ KORAK 3: Konfiguracija Cloud Servera

### 3.1 Ažuriranje .env Fajla

Na cloud serveru (`/var/www/p/.env`):

```env
# API Gateway Configuration (umesto direktnih ERP credentials)
ERP_API_GATEWAY_URL=http://100.x.x.x:3001  # Tailscale IP ili VPN IP lokalnog računara
ERP_API_KEY=isti-api-key-kao-u-api-gateway-.env
ERP_JWT_SECRET=isti-jwt-secret-kao-u-api-gateway-.env  # Opciono, ako koristiš custom JWT secret

# Stare ERP varijable više nisu potrebne:
# ERP_DB_SERVER=...  (možeš obrisati ili ostaviti za backup)
# ERP_DB_PORT=...
# ERP_DB_NAME=...
# ERP_DB_USER=...
# ERP_DB_PASSWORD=...
```

### 3.2 Testiranje Konekcije sa Cloud Servera

```bash
# SSH u cloud server
ssh root@77.77.207.36

# Testiraj konekciju ka API Gateway-u
curl http://100.x.x.x:3001/health

# Dobij JWT token
curl -X POST http://100.x.x.x:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}'

# Testiraj sa JWT tokenom
curl -H "Authorization: Bearer <token>" http://100.x.x.x:3001/api/test
```

### 3.3 Restart Aplikacije

```bash
cd /var/www/p
pm2 restart portalv2
pm2 logs portalv2
```

---

## ✅ KORAK 4: Testiranje Sinkronizacije

1. **Prijavi se kao ADMIN** na cloud aplikaciju
2. **Idi na** `/dashboard/admin/products`
3. **Klikni** "Sinkronizuj iz ERP" dugme
4. **Proveri logove** na API Gateway serveru:

```bash
pm2 logs erp-api-gateway
```

5. **Proveri logove** na cloud serveru:

```bash
pm2 logs portalv2
```

---

## 🔍 Troubleshooting

### Problem: "Cannot connect to API Gateway"

**Proveri:**
- Da li je VPN aktivan?
- Da li API Gateway server radi? (`pm2 status`)
- Da li je port 3001 otvoren u firewall-u na lokalnom računaru?
- Da li IP adresa u `.env` fajlu je tačna?

```bash
# Test ping sa cloud servera
ping 100.x.x.x

# Test port sa cloud servera
telnet 100.x.x.x 3001
```

### Problem: "Unauthorized - Invalid token" ili "Token expired"

**Rešenja:**

1. **Dobij novi JWT token:**
   ```bash
   curl -X POST http://100.x.x.x:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"your-api-key"}'
   ```

2. **Proveri da li je API_KEY identičan** u oba `.env` fajla (API Gateway i Cloud Server)

3. **Proveri da li koristiš `Authorization: Bearer <token>` header** umesto `X-API-Key`

4. **Proveri da li je token istekao** - JWT tokeni imaju expiry (default 24h)

### Problem: "Error connecting to ERP database"

**Proveri:**
- Da li SQL Server radi na lokalnom računaru?
- Da li su kredencijali u API Gateway `.env` fajlu tačni?
- Da li API Gateway računar ima pristup SQL Server-u?

### Problem: Rate Limiting

API Gateway ima rate limiting od 100 zahteva po minuti. Ako dobiješ grešku, sačekaj minutu.

---

## 📊 Monitoring

### Proveri status API Gateway servera:

**Na Windows 11:**

```powershell
# Ako koristiš PM2
pm2 status erp-api-gateway
pm2 logs erp-api-gateway --lines 50

# Ako koristiš NSSM
sc query ERP-API-Gateway

# Ako koristiš Task Scheduler
# Otvori Task Scheduler i proveri status zadatka
```

### Proveri VPN konekciju (Tailscale):

```bash
tailscale status
```

### Proveri da li cloud server može pristupiti API Gateway-u:

```bash
# Sa cloud servera
curl -H "X-API-Key: your-api-key" http://100.x.x.x:3001/api/test
```

---

## 🔐 Sigurnost

1. **API Key**: Koristi jak API ključ (generiši sa `openssl rand -base64 32`)
2. **VPN**: Uvek koristi VPN - nikad ne izlaži API Gateway direktno na internet
3. **Firewall**: Ograniči pristup API Gateway serveru samo sa VPN IP adresa
4. **Rate Limiting**: API Gateway automatski ograničava zahteve (100/min)
5. **HTTPS**: Za production, razmotri SSL/TLS između cloud servera i API Gateway-a

---

## 📝 Checklist

- [ ] API Gateway server instaliran na lokalnoj mreži
- [ ] API Gateway server pokrenut sa PM2
- [ ] VPN konekcija postavljena između cloud servera i lokalnog računara
- [ ] API Gateway `.env` fajl konfigurisan
- [ ] Cloud server `.env` fajl ažuriran sa API Gateway URL-om i API key-jem
- [ ] Test konekcije prošao uspešno
- [ ] Sinkronizacija proizvoda radi
- [ ] Sinkronizacija klijenata radi
- [ ] Sinkronizacija podružnica radi

---

## 🎉 Gotovo!

Sada cloud server može sigurno pristupiti lokalnoj ERP bazi preko API Gateway servera i VPN konekcije!

Za dodatnu pomoć, proverite logove:
- API Gateway: `pm2 logs erp-api-gateway`
- Cloud Server: `pm2 logs portalv2`

