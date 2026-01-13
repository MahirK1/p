# 🪟 Windows 11 Setup - API Gateway Server

Ovaj vodič je specifičan za postavljanje API Gateway servera na Windows 11 računaru.

## 📋 Preduslovi

- Windows 11 računar sa pristupom lokalnoj mreži
- Node.js 18+ instaliran
- Pristup SQL Server-u na Windows 10 (192.168.0.87)

## 🚀 Korak-po-Korak Setup

### 1. Instalacija Node.js

1. Preuzmi Node.js sa https://nodejs.org/
2. Instaliraj **LTS verziju** (18.x ili 20.x)
3. Proveri instalaciju:
   ```powershell
   node --version
   npm --version
   ```

### 2. Kopiranje Projekta

```powershell
# Kreiraj folder
mkdir C:\erp-api-gateway
cd C:\erp-api-gateway

# Kopiraj fajlove iz api-gateway foldera
# (ručno kopiranje, Git, ili preko mreže)
```

### 3. Instalacija Dependencies

```powershell
cd C:\erp-api-gateway
npm install
```

**Ako dobiješ grešku sa `mssql` modulom:**
```powershell
# Instaliraj Windows Build Tools
npm install --global windows-build-tools

# Ili koristi Visual Studio Build Tools
# Preuzmi sa: https://visualstudio.microsoft.com/downloads/
```

### 4. Konfiguracija .env Fajla

```powershell
# Kopiraj env.example
copy env.example .env

# Otvori u Notepad-u
notepad .env
```

**Ažuriraj sledeće vrednosti:**

```env
PORT=3001
API_KEY=generisi-siguran-api-kljuc
JWT_SECRET=generisi-siguran-jwt-secret
JWT_EXPIRES_IN=24h

# ERP Database (SQL Server na Windows 10)
ERP_DB_SERVER=192.168.0.88\SQLEXPRESS
ERP_DB_PORT=1433
ERP_DB_NAME=ITAL_REGISTRI_IMELBIS_
ERP_DB_USER=sa
ERP_DB_PASSWORD=tvoja-lozinka
ERP_DB_ENCRYPT=false
ERP_DB_TRUST_CERT=true

# ERP Table
ERP_LAGER_TABLE=ITAL_IMELBIS_2025
```

**Generiši API Key i JWT Secret:**

```powershell
# U PowerShell-u - generiši API Key
node -e "console.log('API_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Generiši JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

**VAŽNO**: 
- Koristi isti `API_KEY` u `.env` fajlu na cloud serveru!
- Koristi isti `JWT_SECRET` u `.env` fajlu na cloud serveru (opciono, ali preporučeno)!

### 5. Testiranje SQL Server Konekcije

**Proveri da Windows 11 može pristupiti SQL Server-u na Windows 10:**

```powershell
# Test TCP konekcije
Test-NetConnection -ComputerName 192.168.0.87 -Port 1433

# Očekivani output:
# ComputerName     : 192.168.0.87
# RemoteAddress    : 192.168.0.87
# RemotePort       : 1434
# InterfaceAlias   : Ethernet
# SourceAddress    : 192.168.0.X
# TcpTestSucceeded : True
```

Ako `TcpTestSucceeded` je `False`, proveri:
- SQL Server TCP/IP protokol je omogućen (na Windows 10)
- Windows Firewall dozvoljava port 1434 (na Windows 10)
- SQL Server Browser servis radi (na Windows 10)

### 6. Pokretanje API Gateway Servera

**Development (za testiranje):**

```powershell
# Opcija 1: Direktno
node server.js

# Opcija 2: Koristi batch skriptu
.\start-windows.bat
```

**Production sa PM2:**

```powershell
# Instaliraj PM2
npm install -g pm2
npm install -g pm2-windows-startup

# Pokreni server
pm2 start server.js --name erp-api-gateway
pm2 save

# Omogući auto-start
pm2-startup install
```

### 7. Testiranje API Gateway-a

**U browseru:**
- Otvori: `http://localhost:3001/health`

**U PowerShell-u:**

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:3001/health

# Dobij JWT token
$body = @{ apiKey = "your-api-key" } | ConvertTo-Json
$response = Invoke-WebRequest -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType "application/json"
$token = ($response.Content | ConvertFrom-Json).token

# Test sa JWT tokenom
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri http://localhost:3001/api/test -Headers $headers
```

## 🔧 Troubleshooting

### Problem: "Cannot connect to SQL Server"

**Rešenja:**

1. **Proveri SQL Server Configuration Manager na Windows 10:**
   - Otvori SQL Server Configuration Manager
   - SQL Server Network Configuration → Protocols for SQLEXPRESS
   - Desni klik na **TCP/IP** → Enable
   - Desni klik na **TCP/IP** → Properties → IP Addresses
   - Proveri da je **IPAll** → TCP Port = **1434**
   - Restartuj SQL Server servis

2. **Proveri Windows Firewall na Windows 10:**
   ```powershell
   # U PowerShell-u kao Administrator na Windows 10
   New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -LocalPort 1434 -Protocol TCP -Action Allow
   ```

3. **Proveri SQL Server Authentication:**
   - SQL Server Management Studio → Connect to Server
   - Server Properties → Security
   - Omogući "SQL Server and Windows Authentication mode"
   - Restartuj SQL Server servis

4. **Testiraj konekciju sa Windows 11:**
   ```powershell
   Test-NetConnection -ComputerName 192.168.0.87 -Port 1434
   ```

### Problem: "Module build failed" pri npm install

**Rešenje:**
```powershell
npm install --global windows-build-tools
# ili
npm install --global node-gyp
```

### Problem: PM2 ne radi na Windows-u

**Alternative:**

1. **NSSM (Non-Sucking Service Manager):**
   - Preuzmi: https://nssm.cc/download
   - Instaliraj kao Windows Service

2. **Windows Task Scheduler:**
   - Kreiraj zadatak koji pokreće `node server.js` pri Windows startup-u

## 📊 Monitoring

**PM2 Commands:**
```powershell
pm2 status
pm2 logs erp-api-gateway
pm2 restart erp-api-gateway
pm2 stop erp-api-gateway
```

**Windows Event Viewer:**
- Ako koristiš NSSM ili Task Scheduler, proveri Windows Event Viewer za greške

## 🔐 Sigurnost

- **Firewall**: Ograniči pristup portu 3001 samo na lokalnu mrežu (ne izlaži na internet)
- **API Key**: Koristi jak API ključ (32+ karaktera)
- **VPN**: Uvek koristi VPN za komunikaciju sa cloud serverom

## ✅ Checklist

- [ ] Node.js instaliran i radi
- [ ] API Gateway folder kopiran
- [ ] Dependencies instalirane (`npm install`)
- [ ] `.env` fajl kreiran i konfigurisan
- [ ] SQL Server konekcija radi (`Test-NetConnection`)
- [ ] API Gateway server pokrenut
- [ ] Health check radi (`http://localhost:3001/health`)
- [ ] Test endpoint radi sa API key-jem
- [ ] Auto-start konfigurisan (PM2 ili NSSM)
- [ ] VPN instaliran (Tailscale)

