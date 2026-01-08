import sql from "mssql";

let pool: sql.ConnectionPool | null = null;

export async function getErpConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config: sql.config = {
    server: process.env.ERP_DB_SERVER || "", // Format: "192.168.0.87\SQLEXPRESS"
    port: Number(process.env.ERP_DB_PORT) || 1433,
    database: process.env.ERP_DB_NAME || "",
    user: process.env.ERP_DB_USER || "",
    password: process.env.ERP_DB_PASSWORD || "",
    options: {
      encrypt: process.env.ERP_DB_ENCRYPT !== "false", // false za lokalni SQL Server
      trustServerCertificate: process.env.ERP_DB_TRUST_CERT === "true", // true za development
      enableArithAbort: true,
      connectTimeout: 60000, // 60 sekundi za konekciju
      requestTimeout: 60000, // 60 sekundi za query
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  try {
    console.log(`🔌 Povezivanje sa ERP bazom: ${config.server}...`);
    pool = await sql.connect(config);
    console.log("✅ Uspješno povezan sa ERP bazom");
    return pool;
  } catch (error: any) {
    console.error("❌ Greška pri povezivanju sa ERP bazom:");
    console.error("   Server:", config.server);
    console.error("   Database:", config.database);
    console.error("   User:", config.user);
    console.error("   Error:", error.message);
    throw error;
  }
}

export async function closeErpConnection() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Tipovi za ERP proizvod (prilagodi prema svojoj ERP bazi)
export type ErpProduct = {
  SKU: string;
  Name: string;
  CatalogNumber?: string | null;
  Stock: number;
  Price?: number | null;
};
