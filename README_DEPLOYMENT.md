# 📚 Deployment Dokumentacija

Ovaj projekat sadrži kompletnu dokumentaciju za postavljanje PortalV2 aplikacije na cloud server.

## 📄 Dokumenti

### 1. **DEPLOYMENT_GUIDE.md** - Glavni Vodič
   - Detaljni step-by-step vodič sa svim koracima
   - Objašnjenja za svaki korak
   - Troubleshooting sekcija
   - Korisne komande

### 2. **API_GATEWAY_SETUP.md** - API Gateway Setup
   - Podešavanje API Gateway servera na lokalnoj mreži
   - VPN konfiguracija
   - Povezivanje cloud servera sa lokalnom ERP bazom
   - **OBAVEZNO** pročitati ako koristite lokalnu ERP bazu

### 3. **QUICK_START.md** - Brzi Start
   - Skraćena verzija sa najvažnijim koracima
   - Za iskusnije korisnike koji žele brzo postavljanje

### 3. **deploy.sh** - Deployment Skripta
   - Automatizuje osnovne korake build procesa
   - Proverava preduslove
   - Pokreće Prisma migracije

### 4. **ecosystem.config.js** - PM2 Konfiguracija
   - Konfiguracija za PM2 process manager
   - Automatski restart i logovanje

### 5. **nginx.conf.example** - Nginx Konfiguracija
   - Primer Nginx konfiguracije za reverse proxy
   - Podrška za Socket.IO
   - Optimizacija za static fajlove

## 🚀 Brzi Pregled Procesa

1. **Priprema Servera** - Instalacija Node.js, PostgreSQL, Nginx, PM2
2. **Baza Podataka** - Kreiranje PostgreSQL baze i korisnika
3. **Upload Projekta** - Git ili SCP
4. **Konfiguracija** - .env fajl sa svim potrebnim varijablama
5. **Build** - npm run build
6. **Pokretanje** - PM2 za process management
7. **Nginx** - Reverse proxy konfiguracija
8. **Firewall** - Otvaranje potrebnih portova

## 📋 Checklist

- [ ] Pročitajte `DEPLOYMENT_GUIDE.md` za detaljne instrukcije
- [ ] Pripremite server sa potrebnim softverom
- [ ] Kreirajte PostgreSQL bazu podataka
- [ ] Upload-ujte projekat na server
- [ ] Konfigurišite .env fajl
- [ ] Pokrenite Prisma migracije
- [ ] Build-ujte aplikaciju
- [ ] Pokrenite sa PM2
- [ ] Konfigurišite Nginx
- [ ] Testirajte aplikaciju

## 🔗 Server Informacije

- **IP Adresa**: 77.77.207.36
- **Port**: 3000 (interno), 80 (Nginx)
- **Baza Podataka**: PostgreSQL na localhost:5432

## 🆘 Pomoć

Ako naiđete na probleme:

1. Proverite logove:
   - PM2: `pm2 logs portalv2`
   - Nginx: `sudo tail -f /var/log/nginx/error.log`
   - PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-*.log`

2. Proverite status servisa:
   - PM2: `pm2 status`
   - Nginx: `sudo systemctl status nginx`
   - PostgreSQL: `sudo systemctl status postgresql`

3. Proverite da li su portovi otvoreni:
   - `sudo netstat -tlnp | grep 3000`
   - `sudo netstat -tlnp | grep 80`

4. Proverite .env fajl:
   - `cat .env | grep -v PASSWORD` (ne prikazuje lozinke)

## 📞 Kontakt

Za dodatnu pomoć, proverite troubleshooting sekciju u `DEPLOYMENT_GUIDE.md`.

