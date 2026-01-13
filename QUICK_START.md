# ⚡ Brzi Start - Deployment na 77.77.207.36

## 🎯 Ukratko - 5 Osnovnih Koraka

### 1️⃣ Priprema Servera
```bash
# SSH pristup
ssh root@77.77.207.36

# Instalacija Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalacija PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql

# Instalacija PM2
sudo npm install -g pm2

# Instalacija Nginx
sudo apt install nginx -y
```

### 2️⃣ Kreiranje Baze Podataka
```bash
sudo -u postgres psql
```
U PostgreSQL konzoli:
```sql
CREATE DATABASE portalv2;
CREATE USER portalv2_user WITH ENCRYPTED PASSWORD 'VAŠA_LOZINKA';
GRANT ALL PRIVILEGES ON DATABASE portalv2 TO portalv2_user;
\q
```

### 3️⃣ Upload i Setup Projekta
```bash
# Kreiranje direktorijuma
sudo mkdir -p /var/www/portalv2
sudo chown $USER:$USER /var/www/portalv2
cd /var/www/portalv2

# Upload projekta (Git ili SCP)
git clone https://github.com/VAŠ_REPO/PortalV2.git .
# ILI upload preko SCP sa lokalnog računara

# Instalacija dependencies (uključuje tsx za TypeScript execution)
npm install
```

### 4️⃣ Konfiguracija
```bash
# Kreiranje .env fajla
nano .env
```

Dodajte minimalne varijable:
```env
NODE_ENV=production
PORT=3000
PRISMA_DB_URL="postgresql://portalv2_user:VAŠA_LOZINKA@localhost:5432/portalv2?schema=public"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://77.77.207.36"
NEXT_PUBLIC_CLIENT_ORIGIN="http://77.77.207.36"
```

```bash
# Prisma setup
npx prisma generate
npx prisma migrate deploy

# Build
npm run build
```

### 5️⃣ Pokretanje
```bash
# PM2 (tsx je već instaliran preko npm install)
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Nginx konfiguracija
sudo cp nginx.conf.example /etc/nginx/sites-available/portalv2
sudo ln -s /etc/nginx/sites-available/portalv2 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Firewall
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## ✅ Testiranje
Otvorite: `http://77.77.207.36`

---

**Za detaljne instrukcije, pogledajte `DEPLOYMENT_GUIDE.md`**

