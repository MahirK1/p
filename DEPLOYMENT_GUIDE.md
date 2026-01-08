# 📋 Detaljni Vodič za Deployment na Cloud Server

## 🎯 Pregled
Ovaj vodič će vas provesti kroz proces postavljanja PortalV2 aplikacije na cloud server sa IP adresom **77.77.207.36**.

---

## 📦 Preduslovi

### 1. Server Specifikacije
- **OS**: Ubuntu 20.04/22.04 LTS (preporučeno) ili sličan Linux distribucija
- **RAM**: Minimum 2GB (preporučeno 4GB+)
- **CPU**: Minimum 2 core-a
- **Disk**: Minimum 20GB slobodnog prostora
- **Node.js**: Verzija 18.0.0 ili novija
- **PostgreSQL**: Verzija 12 ili novija

### 2. Potrebni Servisi
- PostgreSQL baza podataka (može biti na istom serveru ili remote)
- Email SMTP server (opciono, za slanje email-a)
- Domain name ili direktan pristup preko IP adrese

---

## 🚀 KORAK 1: Povezivanje sa Serverom

### 1.1 SSH Pristup
```bash
ssh root@77.77.207.36
# ili
ssh username@77.77.207.36
```

**Napomena**: Zamenite `username` sa vašim korisničkim imenom. Ako nemate SSH pristup, kontaktirajte vašeg hosting providera.

---

## 🔧 KORAK 2: Priprema Servera

### 2.1 Ažuriranje Sistema
```bash
sudo apt update
sudo apt upgrade -y
```

### 2.2 Instalacija Node.js (verzija 18+)
```bash
# Instalacija Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Provera verzije
node --version  # Trebalo bi da pokaže v18.x.x ili noviju
npm --version
```

### 2.3 Instalacija PostgreSQL
```bash
# Instalacija PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Pokretanje PostgreSQL servisa
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Provera statusa
sudo systemctl status postgresql
```

### 2.4 Kreiranje PostgreSQL Baze Podataka
```bash
# Prebacivanje na postgres korisnika
sudo -u postgres psql

# U PostgreSQL konzoli, izvršite sledeće komande:
CREATE DATABASE portalv2;
CREATE USER portalv2_user WITH ENCRYPTED PASSWORD 'VAŠA_LOZINKA_OVDE';
GRANT ALL PRIVILEGES ON DATABASE portalv2 TO portalv2_user;
\q
```

**VAŽNO**: Zamenite `VAŠA_LOZINKA_OVDE` sa jakom lozinkom. Zapišite je negde sigurno!

### 2.5 Instalacija PM2 (Process Manager)
```bash
# PM2 će održavati aplikaciju pokrenutom i automatski je restartovati ako padne
sudo npm install -g pm2
```

### 2.6 Instalacija Nginx (Web Server / Reverse Proxy)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📥 KORAK 3: Upload Projekta na Server

### 3.1 Opcija A: Koristeći Git (Preporučeno)
```bash
# Instalacija Git-a ako nije instaliran
sudo apt install git -y

# Kreiranje direktorijuma za aplikaciju
sudo mkdir -p /var/www/portalv2
sudo chown $USER:$USER /var/www/portalv2

# Kloniranje projekta (zamenite sa vašim Git URL-om)
cd /var/www
git clone https://github.com/VAŠ_REPO/PortalV2.git portalv2
cd portalv2
```

### 3.2 Opcija B: Koristeći SCP (ako nemate Git)
Sa vašeg lokalnog računara:
```bash
# Kompresovanje projekta
tar -czf portalv2.tar.gz PortalV2/

# Upload na server
scp portalv2.tar.gz username@77.77.207.36:/tmp/

# Na serveru:
cd /var/www
sudo mkdir -p portalv2
sudo chown $USER:$USER portalv2
cd portalv2
tar -xzf /tmp/portalv2.tar.gz --strip-components=1
```

---

## ⚙️ KORAK 4: Konfiguracija Projekta

### 4.1 Instalacija Dependencies
```bash
cd /var/www/portalv2
npm install
```

### 4.2 Kreiranje .env Fajla
```bash
nano .env
```

Dodajte sledeće environment varijable:

```env
# Node Environment
NODE_ENV=production

# Port (možete promeniti ako želite)
PORT=3000

# PostgreSQL Database Connection
PRISMA_DB_URL="postgresql://portalv2_user:VAŠA_LOZINKA_OVDE@localhost:5432/portalv2?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="GENERIŠITE_OVO_SA_openssl_rand_-base64_32"
NEXTAUTH_URL="http://77.77.207.36"

# Client Origin (za CORS i Socket.IO)
NEXT_PUBLIC_CLIENT_ORIGIN="http://77.77.207.36"

# Email Configuration (SMTP) - Opciono
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Push Notifications (VAPID Keys) - Opciono
# Generišite VAPID keys sa: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="VAŠ_PUBLIC_KEY"
VAPID_PRIVATE_KEY="VAŠ_PRIVATE_KEY"
VAPID_SUBJECT="mailto:admin@italgroup.ba"

# ERP Database Connection - Opciono (ako koristite ERP integraciju)
ERP_DB_SERVER=192.168.0.87\SQLEXPRESS
ERP_DB_PORT=1433
ERP_DB_NAME=YourERPDatabase
ERP_DB_USER=erp_user
ERP_DB_PASSWORD=erp_password
ERP_DB_ENCRYPT=false
ERP_DB_TRUST_CERT=true
```

**VAŽNO**: 
- Zamenite `VAŠA_LOZINKA_OVDE` sa lozinkom koju ste kreirali za PostgreSQL korisnika
- Generišite `NEXTAUTH_SECRET` sa: `openssl rand -base64 32`
- Za VAPID keys, instalirajte `web-push` globalno: `npm install -g web-push`, zatim: `web-push generate-vapid-keys`

### 4.3 Generisanje NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Kopirajte rezultat i stavite ga u `.env` fajl kao `NEXTAUTH_SECRET`.

### 4.4 Generisanje VAPID Keys (za Push Notifications)
```bash
npm install -g web-push
web-push generate-vapid-keys
```
Kopirajte `Public Key` i `Private Key` u `.env` fajl.

### 4.5 Pokretanje Prisma Migracija
```bash
# Generisanje Prisma Client-a
npx prisma generate

# Pokretanje migracija
npx prisma migrate deploy
```

**Napomena**: `prisma migrate deploy` se koristi za production, dok `prisma migrate dev` je za development.

---

## 🏗️ KORAK 5: Build Aplikacije

```bash
cd /var/www/portalv2
npm run build
```

Ovo će:
1. Generisati Prisma Client
2. Build-ovati Next.js aplikaciju za production

---

## 🚀 KORAK 6: Pokretanje Aplikacije sa PM2

### 6.1 Kreiranje PM2 Ecosystem Fajla (Opciono)
```bash
nano ecosystem.config.js
```

Dodajte:
```javascript
module.exports = {
  apps: [{
    name: 'portalv2',
    script: 'server.ts',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 6.2 Pokretanje sa PM2
```bash
# Kreiranje logs direktorijuma
mkdir -p logs

# Pokretanje aplikacije
pm2 start ecosystem.config.js
# ili jednostavno:
pm2 start npm --name "portalv2" -- start

# Provera statusa
pm2 status

# Pregled logova
pm2 logs portalv2

# Čuvanje PM2 konfiguracije (da se automatski pokrene nakon restart-a servera)
pm2 save
pm2 startup
```

**Napomena**: `server.ts` je TypeScript fajl, ali Next.js build proces ga automatski kompajlira. PM2 pokreće aplikaciju preko `npm start` komande koja koristi već kompajlirani kod.

---

## 🌐 KORAK 7: Konfiguracija Nginx kao Reverse Proxy

### 7.1 Kreiranje Nginx Konfiguracije
```bash
sudo nano /etc/nginx/sites-available/portalv2
```

Dodajte sledeću konfiguraciju:

```nginx
server {
    listen 80;
    server_name 77.77.207.36;  # Ili vaš domain name ako imate

    # Povećanje max body size za upload fajlova
    client_max_body_size 50M;

    # Proxy za Next.js aplikaciju
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout za Socket.IO
        proxy_read_timeout 86400;
    }

    # Socket.IO endpoint
    location /api/socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout za Socket.IO
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.2 Aktiviranje Konfiguracije
```bash
# Kreiranje simboličke veze
sudo ln -s /etc/nginx/sites-available/portalv2 /etc/nginx/sites-enabled/

# Testiranje Nginx konfiguracije
sudo nginx -t

# Restart Nginx-a
sudo systemctl restart nginx
```

---

## 🔒 KORAK 8: Konfiguracija Firewall-a

### 8.1 UFW (Ubuntu Firewall)
```bash
# Dozvoljava SSH (važno - uradite ovo prvo!)
sudo ufw allow 22/tcp

# Dozvoljava HTTP
sudo ufw allow 80/tcp

# Dozvoljava HTTPS (ako koristite SSL)
sudo ufw allow 443/tcp

# Aktiviranje firewall-a
sudo ufw enable

# Provera statusa
sudo ufw status
```

---

## ✅ KORAK 9: Testiranje

### 9.1 Provera da li Aplikacija Radi
```bash
# Provera PM2 statusa
pm2 status

# Provera logova
pm2 logs portalv2 --lines 50

# Provera da li port 3000 sluša
sudo netstat -tlnp | grep 3000
# ili
sudo ss -tlnp | grep 3000
```

### 9.2 Testiranje u Browser-u
Otvorite browser i idite na:
```
http://77.77.207.36
```

Trebalo bi da vidite login stranicu aplikacije.

---

## 🔐 KORAK 10: SSL/HTTPS Konfiguracija (Opciono, ali Preporučeno)

### 10.1 Instalacija Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 10.2 Dobijanje SSL Certifikata
```bash
# Ako imate domain name
sudo certbot --nginx -d yourdomain.com

# Ako nemate domain name, možete koristiti IP adresu ali to nije preporučeno
# U tom slučaju, možete koristiti self-signed certificate:
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

### 10.3 Ažuriranje Nginx Konfiguracije za HTTPS
Ako koristite Certbot, on će automatski ažurirati Nginx konfiguraciju. Ako koristite self-signed certificate, ažurirajte `/etc/nginx/sites-available/portalv2`:

```nginx
server {
    listen 443 ssl http2;
    server_name 77.77.207.36;

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    # ... ostatak konfiguracije kao gore ...
}

# Redirect HTTP na HTTPS
server {
    listen 80;
    server_name 77.77.207.36;
    return 301 https://$server_name$request_uri;
}
```

---

## 🔄 KORAK 11: Automatski Restart i Monitoring

### 11.1 PM2 Monitoring
```bash
# Web dashboard za monitoring (opciono)
pm2 web

# Automatski restart nakon server restart-a (već urađeno sa pm2 startup)
```

### 11.2 Systemd Service (Alternativa PM2)
Ako želite da koristite systemd umesto PM2, kreirajte service fajl:

```bash
sudo nano /etc/systemd/system/portalv2.service
```

Dodajte:
```ini
[Unit]
Description=PortalV2 Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/portalv2
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Zatim:
```bash
sudo systemctl daemon-reload
sudo systemctl enable portalv2
sudo systemctl start portalv2
sudo systemctl status portalv2
```

---

## 📊 KORAK 12: Kreiranje Admin Korisnika

Nakon što je aplikacija pokrenuta, kreirajte admin korisnika:

```bash
cd /var/www/portalv2
node scripts/create-admin.cjs
```

Ili ako imate skriptu za kreiranje korisnika:
```bash
node scripts/create-user.cjs
```

---

## 🛠️ KORAK 13: Održavanje i Backup

### 13.1 Backup Baze Podataka
```bash
# Kreiranje backup skripte
nano /home/backup-db.sh
```

Dodajte:
```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U portalv2_user portalv2 > $BACKUP_DIR/portalv2_$DATE.sql
# Čuvanje samo poslednjih 7 dana
find $BACKUP_DIR -name "portalv2_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/backup-db.sh

# Dodavanje u crontab za dnevni backup u 2:00 AM
crontab -e
# Dodajte:
0 2 * * * /home/backup-db.sh
```

### 13.2 Log Rotation
PM2 automatski rotira logove, ali možete konfigurisati dodatno:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🐛 Troubleshooting

### Problem: Aplikacija se ne pokreće
```bash
# Provera logova
pm2 logs portalv2

# Provera da li je port zauzet
sudo lsof -i :3000

# Provera environment varijabli
pm2 env 0
```

### Problem: Database Connection Error
```bash
# Provera PostgreSQL statusa
sudo systemctl status postgresql

# Testiranje konekcije
psql -U portalv2_user -d portalv2 -h localhost

# Provera .env fajla
cat .env | grep PRISMA_DB_URL
```

### Problem: Nginx 502 Bad Gateway
```bash
# Provera da li aplikacija radi
pm2 status

# Provera Nginx error logova
sudo tail -f /var/log/nginx/error.log

# Provera da li port 3000 sluša
sudo netstat -tlnp | grep 3000
```

### Problem: Socket.IO ne radi
- Proverite da li je `NEXT_PUBLIC_CLIENT_ORIGIN` tačno postavljen
- Proverite Nginx konfiguraciju za `/api/socket.io`
- Proverite firewall da dozvoljava WebSocket konekcije

---

## 📝 Checklist za Deployment

- [ ] Server pripremljen (Node.js, PostgreSQL, Nginx instalirani)
- [ ] PostgreSQL baza i korisnik kreirani
- [ ] Projekat upload-ovan na server
- [ ] `.env` fajl kreiran sa svim potrebnim varijablama
- [ ] Prisma migracije pokrenute
- [ ] Aplikacija build-ovana (`npm run build`)
- [ ] PM2 pokrenuo aplikaciju
- [ ] Nginx konfigurisan kao reverse proxy
- [ ] Firewall konfigurisan
- [ ] Aplikacija dostupna na `http://77.77.207.36`
- [ ] Admin korisnik kreiran
- [ ] Backup strategija postavljena
- [ ] SSL/HTTPS konfigurisan (opciono)

---

## 🎉 Gotovo!

Vaša aplikacija bi sada trebalo da radi na `http://77.77.207.36`!

Za dodatnu pomoć ili pitanja, proverite logove:
- PM2 logovi: `pm2 logs portalv2`
- Nginx logovi: `sudo tail -f /var/log/nginx/error.log`
- PostgreSQL logovi: `sudo tail -f /var/log/postgresql/postgresql-*.log`

---

## 📞 Korisne Komande

```bash
# Restart aplikacije
pm2 restart portalv2

# Zaustavljanje aplikacije
pm2 stop portalv2

# Pokretanje aplikacije
pm2 start portalv2

# Pregled statusa
pm2 status

# Pregled logova u realnom vremenu
pm2 logs portalv2 --lines 100

# Restart Nginx-a
sudo systemctl restart nginx

# Restart PostgreSQL-a
sudo systemctl restart postgresql

# Pregled zauzetih portova
sudo netstat -tlnp
```

---

**Napomena**: Ovaj vodič pretpostavlja da imate root ili sudo pristup serveru. Ako nemate, kontaktirajte vašeg hosting providera za pomoć.

