// scripts/sync-to-vercel.cjs
const sql = require("mssql");
require("dotenv").config({ path: ".env.local" }); // Opciono: ako koristiš .env.local

// Konfiguracija ERP baze (iz .env fajla ili direktno)
const erpConfig = {
  server: process.env.ERP_DB_SERVER || "192.168.0.87\\SQLEXPRESS",
  port: Number(process.env.ERP_DB_PORT) || 1433,
  database: process.env.ERP_DB_NAME || "ITAL_REGISTRI_IMELBIS_",
  user: process.env.ERP_DB_USER || "sa",
  password: process.env.ERP_DB_PASSWORD || "12!?qwQW",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 60000,
    requestTimeout: 60000,
  },
};

// Vercel API URL i API key
const VERCEL_API_URL = process.env.VERCEL_API_URL || "https://your-app.vercel.app";
const SYNC_API_KEY = process.env.SYNC_API_KEY; // Morate postaviti u Vercel environment variables

if (!SYNC_API_KEY) {
  console.error("❌ SYNC_API_KEY nije postavljen u environment varijablama!");
  process.exit(1);
}

async function syncProducts(pool, tableName) {
  console.log("📦 Sinkronizacija proizvoda...");

  const query = `
    SELECT 
      Lager.ArtikliId AS product_id,
      Lager.SkladistaId AS Skladiste, 
      Artikli.ArtikalSifra AS SKU, 
      Lager.Naziv AS Name,  
      SUM([Zaliha]) AS Stock, 
      CONVERT(DECIMAL(10,2), Cjenovnik.CjenovnikCijena) AS Price,
      Artikli.ArtikalKatalog AS CatalogNumber
    FROM 
      [${tableName}].[dbo].[Lager]  
    LEFT JOIN 
      [ITAL_REGISTRI_IMELBIS_].[dbo].[Cjenovnik] ON Lager.ArtikliId = Cjenovnik.ArtikliId 
    LEFT JOIN 
      [ITAL_REGISTRI_IMELBIS_].[dbo].[Artikli] ON Lager.ArtikliId = Artikli.Id 
    WHERE 
      Cjenovnik.CjenovnikVrstaId = 184
      AND Lager.SkladistaId = 3 
    GROUP BY 
      Lager.ArtikliId, Lager.Naziv, Cjenovnik.CjenovnikCijena, Artikli.ArtikalSifra, Artikli.ArtikalKatalog, Lager.SkladistaId 
    ORDER BY 
      Lager.ArtikliId
  `;

  const result = await pool.request().query(query);
  const products = result.recordset.map((row) => ({
    SKU: row.SKU,
    Name: row.Name,
    CatalogNumber: row.CatalogNumber || null,
    Stock: Number(row.Stock) || 0,
    Price: row.Price ? Number(row.Price) : null,
    Description: null,
    Brand: null, // Dodati logiku za brand ako je potrebno
  }));

  // Pošalji na Vercel
  const response = await fetch(`${VERCEL_API_URL}/api/sync/receive/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SYNC_API_KEY,
    },
    body: JSON.stringify({ products, tableName }),
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`✅ Proizvodi: ${data.stats.created} kreirano, ${data.stats.updated} ažurirano, ${data.stats.errors} grešaka`);
    return data.stats;
  } else {
    throw new Error(data.error || "Greška pri slanju proizvoda");
  }
}

async function syncClients(pool) {
  console.log("👥 Sinkronizacija klijenata...");

  const clientsQuery = `
    SELECT 
      Id AS ERP_ID,
      SIFRA AS Code,
      IME AS Name,
      ADRESA AS Address,
      SJEDISTE AS City,
      Telefon AS Phone,
      EMAIL AS Email,
      MAT_BROJ AS MatBroj,
      COALESCE(EUPDVBroj, CASE WHEN PDV = 1 THEN MAT_BROJ ELSE NULL END) AS PdvBroj,
      KOMENTAR AS Note
    FROM 
      [ITAL_REGISTRI_IMELBISR_].[dbo].[Partner]
    WHERE 
      (Neaktivan = 0 OR Neaktivan IS NULL)
      AND (Skriven = 0 OR Skriven IS NULL)
    ORDER BY 
      IME
  `;

  const clientsResult = await pool.request().query(clientsQuery);
  const clients = clientsResult.recordset.map((row) => ({
    ERP_ID: row.ERP_ID,
    Name: row.Name,
    MatBroj: row.MatBroj || null,
    Address: row.Address || null,
    City: row.City || null,
    Phone: row.Phone || null,
    Email: row.Email || null,
    PdvBroj: row.PdvBroj || null,
    Note: row.Note || null,
  }));

  // Sinkronizuj podružnice
  const branchesQuery = `
    SELECT 
      rj.Id AS ERP_ID,
      rj.PartnerId AS PartnerERP_ID,
      rj.Sifra AS Code,
      rj.Naziv AS Name,
      rj.IDBroj AS IdBroj,
      rj.Adresa AS Address,
      rj.Mjesto AS City,
      rj.Telefon AS Phone,
      rj.Email AS Email,
      rj.KontaktOsoba AS ContactPerson,
      rj.PTTBroj AS ZipCode
    FROM 
      [ITAL_REGISTRI_IMELBISR_].[dbo].[RjPartnera] rj
    WHERE 
      (rj.Skriven = 0 OR rj.Skriven IS NULL)
    ORDER BY 
      rj.PartnerId, rj.Naziv
  `;

  const branchesResult = await pool.request().query(branchesQuery);
  const branches = branchesResult.recordset.map((row) => ({
    ERP_ID: row.ERP_ID,
    PartnerERP_ID: row.PartnerERP_ID,
    Name: row.Name,
    IdBroj: row.IdBroj || null,
    Address: row.Address || null,
    City: row.City || null,
    Phone: row.Phone || null,
    Email: row.Email || null,
    ContactPerson: row.ContactPerson || null,
    ZipCode: row.ZipCode || null,
  }));

  // Pošalji na Vercel
  const response = await fetch(`${VERCEL_API_URL}/api/sync/receive/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SYNC_API_KEY,
    },
    body: JSON.stringify({ clients, branches }),
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`✅ Klijenti: ${data.stats.clients.created} kreirano, ${data.stats.clients.updated} ažurirano`);
    console.log(`✅ Podružnice: ${data.stats.branches.created} kreirano, ${data.stats.branches.updated} ažurirano`);
    return data.stats;
  } else {
    throw new Error(data.error || "Greška pri slanju klijenata");
  }
}

async function main() {
  let pool = null;

  try {
    console.log("🚀 Počinje sinkronizacija na Vercel...\n");

    // Poveži se na ERP bazu
    console.log(`🔌 Povezivanje sa ERP bazom: ${erpConfig.server}...`);
    pool = await sql.connect(erpConfig);
    console.log("✅ Uspješno povezan sa ERP bazom\n");

    // Učitaj naziv tabele (možeš pročitati iz fajla ili koristiti default)
    const tableName = process.env.ERP_LAGER_TABLE || "ITAL_IMELBIS_2025";

    // Sinkronizuj proizvode
    await syncProducts(pool, tableName);
    console.log("");

    // Sinkronizuj klijente i podružnice
    await syncClients(pool);

    console.log("\n✨ Sinkronizacija završena!");
  } catch (error) {
    console.error("\n❌ Greška:", error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

main();
