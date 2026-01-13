import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting - zaštita od previše zahteva
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut
  max: 100 // maksimum 100 zahteva po minutu
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// JWT Autentikacija middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - No token provided' 
      });
    }

    // Format: "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid token format' 
      });
    }

    // Verifikuj JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Dodaj decoded token u request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Token expired' 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid token' 
      });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized - Authentication failed' 
    });
  }
};

// Endpoint za generisanje JWT tokena (za testiranje)
app.post('/api/auth/login', (req, res) => {
  const { apiKey } = req.body;
  const expectedApiKey = process.env.API_KEY || 'your-secret-api-key-here';
  
  if (apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API Key'
    });
  }

  // Generiši JWT token
  const token = jwt.sign(
    { 
      service: 'cloud-api',
      timestamp: new Date().toISOString()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    token,
    expiresIn: JWT_EXPIRES_IN
  });
});

// SQL Server konfiguracija
const sqlConfig = {
  server: process.env.ERP_DB_SERVER || '192.168.0.87\\SQLEXPRESS',
  port: Number(process.env.ERP_DB_PORT) || 1434,
  database: process.env.ERP_DB_NAME || '',
  user: process.env.ERP_DB_USER || '',
  password: process.env.ERP_DB_PASSWORD || '',
  options: {
    encrypt: process.env.ERP_DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.ERP_DB_TRUST_CERT === 'true',
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Connection pool
let pool = null;

async function getPool() {
  if (!pool || !pool.connected) {
    console.log('🔌 Povezivanje sa ERP bazom...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Uspješno povezan sa ERP bazom');
  }
  return pool;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ERP API Gateway'
  });
});

// Test konekcije sa bazom (zahteva JWT autentikaciju)
app.get('/api/test', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT @@VERSION AS version');
    
    res.json({
      success: true,
      connected: true,
      version: result.recordset[0].version.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Greška pri testiranju konekcije:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// Endpoint za proizvode (lager)
app.get('/api/products', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    
    const tableName = process.env.ERP_LAGER_TABLE || 'ITAL_IMELBIS_2025';
    
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

    console.log(`📦 Učitavanje proizvoda iz tabele: ${tableName}`);
    const result = await pool.request().query(query);

    res.json({
      success: true,
      count: result.recordset.length,
      products: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Greška pri učitavanju proizvoda:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint za klijente
app.get('/api/clients', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    
    const query = `
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
        [ITAL_REGISTRI_IMELBIS_].[dbo].[Partner]
      WHERE 
        (Neaktivan = 0 OR Neaktivan IS NULL)
        AND (Skriven = 0 OR Skriven IS NULL)
      ORDER BY 
        IME
    `;

    console.log('📦 Učitavanje klijenata...');
    const result = await pool.request().query(query);

    res.json({
      success: true,
      count: result.recordset.length,
      clients: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Greška pri učitavanju klijenata:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint za podružnice/lokacije
app.get('/api/branches', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    
    const query = `
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
        [ITAL_REGISTRI_IMELBIS_].[dbo].[RjPartnera] rj
      WHERE 
        (rj.Skriven = 0 OR rj.Skriven IS NULL)
      ORDER BY 
        rj.PartnerId, rj.Naziv
    `;

    console.log('📦 Učitavanje podružnica...');
    const result = await pool.request().query(query);

    res.json({
      success: true,
      count: result.recordset.length,
      branches: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Greška pri učitavanju podružnica:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Neočekivana greška:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ERP API Gateway server running on port ${PORT}`);
  console.log(`📡 Ready to serve requests from cloud server`);
  console.log(`🔐 JWT authentication enabled`);
  console.log(`📊 Rate limit: 100 requests per minute`);
  console.log(`🔑 Login endpoint: POST /api/auth/login`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM signal received: closing HTTP server');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

