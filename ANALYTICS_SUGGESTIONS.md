# Prijedlozi za dodatne analitike - Direktor i Manager Dashboard

## Pregled trenutnih analitika

### Trenutno implementirano:
- ✅ Ukupna prodaja i narudžbe
- ✅ Prosječna vrijednost narudžbe
- ✅ Posjete (planirane, završene, otkazane)
- ✅ Konverzija posjeta u narudžbe
- ✅ Prodaja po danima/satima/danima u sedmici
- ✅ Prodaja po brendu i proizvodima
- ✅ Performance ranking komercijalista
- ✅ Realizacija planova
- ✅ Top klijenti

---

## 🎯 PRIJEDLOZI ZA DODATNE ANALITIKE

### 1. **Analitika trendova i predviđanja**

#### 1.1. Trend analiza (mjesec po mjesec)
- **Opis**: Grafikoni koji prikazuju trend prodaje, narudžbi i posjeta kroz posljednjih 6-12 mjeseci
- **Korist**: Identifikacija sezonskih obrazaca i dugoročnih trendova
- **Implementacija**:
  - API endpoint: `/api/analytics/trends?period=6m` ili `12m`
  - Prikaz: Line chart sa mjesecima na X osi
  - Metrike: Prodaja, narudžbe, posjete, konverzija

#### 1.2. Predviđanje prodaje (forecasting)
- **Opis**: Predviđanje prodaje za sljedeći mjesec na osnovu historijskih podataka
- **Korist**: Planiranje i postavljanje realističnih ciljeva
- **Implementacija**:
  - Jednostavna linearna regresija ili moving average
  - Prikaz: "Očekivana prodaja za sljedeći mjesec: X KM"

#### 1.3. Year-over-Year (YoY) poređenje
- **Opis**: Poređenje trenutnog mjeseca sa istim mjesecom prošle godine
- **Korist**: Identifikacija rasta/pada bez sezonskih uticaja
- **Implementacija**:
  - Dodati u `previousPeriod` objekt: `sameMonthLastYear`
  - Prikaz: "U odnosu na prošlu godinu: +15%"

---

### 2. **Analitika klijenata**

#### 2.1. Customer Lifetime Value (CLV)
- **Opis**: Ukupna vrijednost klijenta kroz cijelu historiju
- **Korist**: Identifikacija najvrijednijih klijenata
- **Implementacija**:
  - Izračun: Suma svih narudžbi po klijentu
  - Prikaz: Top 20 klijenata po CLV

#### 2.2. Novi vs postojeći klijenti
- **Opis**: Razdvajanje prodaje između novih i postojećih klijenata
- **Korist**: Mjerenje uspjeha u privlačenju novih klijenata
- **Implementacija**:
  - Novi klijent = prva narudžba u ovom periodu
  - Metrike: Broj novih klijenata, prodaja od novih, prodaja od postojećih

#### 2.3. Klijenti po frekvenciji narudžbi
- **Opis**: Segmentacija klijenata po tome koliko često naručuju
- **Korist**: Identifikacija aktivnih vs pasivnih klijenata
- **Implementacija**:
  - Segmenti: Aktivni (narudžba svaki mjesec), Povremeni (1-3 mjeseca), Pasivni (3+ mjeseca)
  - Prikaz: Pie chart ili bar chart

#### 2.4. Churn analiza (gubitak klijenata)
- **Opis**: Identifikacija klijenata koji nisu naručivali u posljednjih X mjeseci
- **Korist**: Rano upozorenje za akcije zadržavanja
- **Implementacija**:
  - Lista klijenata bez narudžbi u posljednja 3-6 mjeseci
  - Prikaz: Tabela sa kontakt informacijama

---

### 3. **Analitika proizvoda**

#### 3.1. Profitabilnost proizvoda
- **Opis**: Proizvodi sa najvećom maržom (ako imamo podatke o cijeni)
- **Korist**: Fokus na najprofitabilnije proizvode
- **Implementacija**:
  - Potrebno dodati polje `costPrice` u Product model (ako već ne postoji)
  - Izračun: `profit = salesPrice - costPrice`

#### 3.2. Proizvodi u padu/rastu
- **Opis**: Proizvodi čija prodaja raste ili pada u odnosu na prethodni period
- **Korist**: Identifikacija trendova u prodaji proizvoda
- **Implementacija**:
  - Poređenje prodaje proizvoda između dva perioda
  - Prikaz: Top 10 rastućih, Top 10 padajućih

#### 3.3. Cross-selling analiza
- **Opis**: Koji proizvodi se često kupuju zajedno
- **Korist**: Preporuke za bundling i cross-selling strategije
- **Implementacija**:
  - Analiza koja proizvoda se nalaze u istim narudžbama
  - Prikaz: "Proizvod A se često kupuje sa proizvodom B (X% slučajeva)"

#### 3.4. Stock turnover rate
- **Opis**: Brzina prodaje proizvoda (ako imamo podatke o zalihama)
- **Korist**: Optimizacija zaliha
- **Implementacija**:
  - Potrebno dodati `stockQuantity` u Product model
  - Izračun: `turnover = quantitySold / averageStock`

---

### 4. **Analitika komercijalista**

#### 4.1. Aktivnost komercijalista (heatmap)
- **Opis**: Kalendarski prikaz aktivnosti po danima
- **Korist**: Vizualizacija radnih dana i aktivnosti
- **Implementacija**:
  - Heatmap sa intenzitetom boje prema broju posjeta/narudžbi
  - Prikaz: GitHub-style contribution graph

#### 4.2. Prosječno vrijeme između posjete i narudžbe
- **Opis**: Koliko dana u prosjeku prođe od posjete do narudžbe
- **Korist**: Mjerenje efikasnosti posjeta
- **Implementacija**:
  - Već postoji `avgDaysToOrder` u `salesByCommercial`
  - Možemo dodati detaljniji prikaz: distribucija dana (0-1 dan, 2-3 dana, 4-7 dana, 7+ dana)

#### 4.3. Prosječna vrijednost narudžbe po komercijalisti
- **Opis**: Već postoji, ali možemo dodati:
  - Trend prosječne vrijednosti kroz mjesece
  - Poređenje sa timom (iznad/prosjek/ispod prosjeka)

#### 4.4. Retention rate komercijalista
- **Opis**: Postotak klijenata koji nastavljaju naručivati od istog komercijaliste
- **Korist**: Mjerenje kvalitete odnosa sa klijentima
- **Implementacija**:
  - Izračun: Klijenti sa 2+ narudžbama / Ukupno klijenata

#### 4.5. Geografska analitika (ako imamo lokacije)
- **Opis**: Prodaja i posjete po gradovima/regijama
- **Korist**: Identifikacija najproduktivnijih područja
- **Implementacija**:
  - Koristiti `city` polje iz Client modela
  - Prikaz: Mapa ili bar chart po gradovima

---

### 5. **Analitika posjeta**

#### 5.1. Razlog otkazivanja posjeta
- **Opis**: Analiza razloga otkazivanja (ako se čuvaju u napomeni)
- **Korist**: Identifikacija problema i poboljšanja
- **Implementacija**:
  - Parsiranje napomena za otkazane posjete (traži "RAZLOG OTKAZIVANJA")
  - Prikaz: Word cloud ili bar chart najčešćih razloga

#### 5.2. Prosječno trajanje posjete
- **Opis**: Vrijeme između početka i kraja posjete (ako imamo podatke)
- **Korist**: Optimizacija vremena na terenu
- **Implementacija**:
  - Potrebno dodati `completedAt` timestamp u Visit model
  - Izračun: `duration = completedAt - scheduledAt`

#### 5.3. Posjete bez narudžbi (missed opportunities)
- **Opis**: Lista završenih posjeta koje nisu rezultovale narudžbom
- **Korist**: Identifikacija klijenata koji trebaju dodatnu pažnju
- **Implementacija**:
  - Posjete sa statusom DONE bez narudžbi u narednih 7 dana
  - Prikaz: Tabela sa detaljima posjete i klijenta

#### 5.4. Posjete po vremenu dana
- **Opis**: Analiza u kojim satima se obavljaju najuspješnije posjete
- **Korist**: Optimizacija rasporeda posjeta
- **Implementacija**:
  - Grupisanje posjeta po satima (8-10, 10-12, 12-14, 14-16, 16-18)
  - Prikaz: Bar chart sa konverzijom po vremenskim slotovima

---

### 6. **Analitika performansi**

#### 6.1. KPI Dashboard sa targetima
- **Opis**: Centralizovani prikaz svih KPI-jeva sa vizualnim indikatorima postignuća
- **Korist**: Brz pregled performansi
- **Implementacija**:
  - Kartice sa progress barovima za svaki KPI
  - Boje: Zeleno (100%+), Plavo (80-99%), Žuto (50-79%), Crveno (<50%)

#### 6.2. Benchmarking (poređenje sa prosjekom)
- **Opis**: Poređenje performansi komercijalista sa timskim prosjekom
- **Korist**: Identifikacija iznad/prosjek/ispod prosjeka
- **Implementacija**:
  - Izračun prosjeka za svaki KPI
  - Prikaz: "Iznad prosjeka za X%", "Ispod prosjeka za Y%"

#### 6.3. Goal completion timeline
- **Opis**: Grafikoni koji prikazuju napredak ka ciljevima kroz mjesec
- **Korist**: Praćenje napretka u realnom vremenu
- **Implementacija**:
  - Line chart sa dnevnom akumulacijom prodaje vs target
  - Prikaz: "Trenutno: 65% cilja, očekivano: 95% do kraja mjeseca"

---

### 7. **Analitika vremena i efikasnosti**

#### 7.1. Time to first order (novi klijenti)
- **Opis**: Prosječno vrijeme od prve posjete do prve narudžbe za nove klijente
- **Korist**: Mjerenje efikasnosti onboarding procesa
- **Implementacija**:
  - Izračun za klijente sa prvom narudžbom u periodu
  - Prikaz: Prosjek dana

#### 7.2. Order fulfillment time
- **Opis**: Vrijeme od kreiranja narudžbe do završetka (ako imamo status tracking)
- **Korist**: Mjerenje brzine isporuke
- **Implementacija**:
  - Koristiti `createdAt` i `completedAt` (ako postoji) iz Order modela
  - Prikaz: Prosječno vrijeme u danima

#### 7.3. Peak hours analiza
- **Opis**: Najproduktivniji sati za narudžbe i posjete
- **Korist**: Optimizacija rasporeda rada
- **Implementacija**:
  - Već postoji `salesByHour`, možemo dodati vizualizaciju sa preporukama

---

### 8. **Napredne analitike**

#### 8.1. Cohort analiza
- **Opis**: Praćenje performansi grupa klijenata ili komercijalista kroz vrijeme
- **Korist**: Dugoročna analiza retencije i vrijednosti
- **Implementacija**:
  - Grupisanje po mjesecu prve narudžbe (klijenti) ili zaposlenja (komercijalisti)
  - Prikaz: Heatmap sa mjesecima

#### 8.2. Funnel analiza (posjeta → narudžbe)
- **Opis**: Vizualizacija konverzije kroz cijeli proces
- **Korist**: Identifikacija gdje se gube klijenti
- **Implementacija**:
  - Funnel: Planirane posjete → Završene posjete → Narudžbe → Odobrene narudžbe
  - Prikaz: Funnel chart sa postocima

#### 8.3. Correlation analiza
- **Opis**: Povezanost između različitih metrika (npr. broj posjeta vs prodaja)
- **Korist**: Identifikacija faktora koji utiču na prodaju
- **Implementacija**:
  - Pearson correlation coefficient između metrika
  - Prikaz: Correlation matrix heatmap

---

### 9. **Reporting i eksport**

#### 9.1. Automatski izvještaji
- **Opis**: Generisanje i slanje PDF/Excel izvještaja na email
- **Korist**: Redovno praćenje bez ručnog eksporta
- **Implementacija**:
  - Cron job za generisanje izvještaja
  - Email servis za slanje

#### 9.2. Customizovani izvještaji
- **Opis**: Korisnici biraju koje metrike žele u izvještaju
- **Korist**: Fleksibilnost za različite potrebe
- **Implementacija**:
  - UI za odabir metrika i perioda
  - Generisanje custom CSV/PDF

#### 9.3. Real-time notifications
- **Opis**: Obavještenja za važne događaje (npr. postignut target, pad prodaje)
- **Korist**: Brza reakcija na promjene
- **Implementacija**:
  - WebSocket ili polling za real-time updates
  - Push notifications (već postoji implementacija)

---

### 10. **Vizualizacije i UX poboljšanja**

#### 10.1. Interaktivni grafikoni
- **Opis**: Korištenje biblioteke kao što je Chart.js ili Recharts za interaktivne grafikone
- **Korist**: Bolje korisničko iskustvo
- **Implementacija**:
  - Zamjena trenutnih bar chartova sa interaktivnim graficima
  - Zoom, filter, tooltip funkcionalnosti

#### 10.2. Dashboard customization
- **Opis**: Korisnici mogu prilagoditi layout i metrike koje vide
- **Korist**: Personalizacija za različite potrebe
- **Implementacija**:
  - Drag & drop za reorganizaciju kartica
  - Spremanje preferencija u bazu

#### 10.3. Comparative view
- **Opis**: Side-by-side poređenje različitih perioda ili komercijalista
- **Korist**: Lako poređenje performansi
- **Implementacija**:
  - Split view sa dva panela
  - Sync scroll i zoom

---

## 📊 Prioritet implementacije

### Visok prioritet (brzo implementirati):
1. ✅ **Trend analiza (mjesec po mjesec)** - Lako implementirati, velika korist
2. ✅ **Novi vs postojeći klijenti** - Važno za mjerenje rasta
3. ✅ **Churn analiza** - Kritično za zadržavanje klijenata
4. ✅ **Razlog otkazivanja posjeta** - Već imamo podatke u napomenama
5. ✅ **Posjete bez narudžbi** - Identifikacija missed opportunities

### Srednji prioritet:
6. **Customer Lifetime Value (CLV)**
7. **Proizvodi u padu/rastu**
8. **Aktivnost komercijalista (heatmap)**
9. **KPI Dashboard sa targetima**
10. **Funnel analiza**

### Nizak prioritet (dugoročno):
11. **Cohort analiza**
12. **Correlation analiza**
13. **Dashboard customization**
14. **Automatski izvještaji**

---

## 🔧 Tehnički zahtjevi

### Potrebne izmjene u bazi podataka:
- `Visit.completedAt` (timestamp) - za trajanje posjete
- `Product.costPrice` (decimal) - za profitabilnost
- `Product.stockQuantity` (integer) - za stock turnover
- `Order.completedAt` (timestamp) - za fulfillment time

### Potrebne biblioteke:
- Chart.js ili Recharts za interaktivne grafikone
- date-fns ili moment.js za naprednu manipulaciju datuma
- pdf-lib ili jsPDF za generisanje PDF izvještaja

### API izmjene:
- Dodati nove endpoint-e za specifične analitike
- Optimizovati postojeće query-je za bolje performanse
- Dodati caching za često korištene podatke

---

## 📝 Napomene

- Sve prijedloge treba implementirati postepeno, počevši od visokog prioriteta
- Važno je testirati performanse prije dodavanja kompleksnih analitika
- Korisnički feedback treba koristiti za prilagodbu prioriteta
- Dokumentacija treba biti ažurna za sve nove analitike

