import { prisma } from "@/lib/prisma";
import { getErpConnection, type ErpProduct } from "@/lib/erp-db";
import sql from "mssql";

export async function syncProducts() {
  console.log("🔄 Počinje sinkronizacija proizvoda iz ERP baze...");

  let pool: sql.ConnectionPool | null = null;
  
  try {
    // Učitaj naziv tabele iz settings-a
    const tableSetting = await prisma.appSetting.findUnique({
      where: { key: "erp_lager_table" },
    });
    
    // Default vrijednost ako setting ne postoji
    const tableName = tableSetting?.value || "ITAL_IMELBIS_2025";
    
    console.log(`📊 Koristi se tabela: ${tableName}`);

    // Konektuj se na ERP bazu
    pool = await getErpConnection();

    // SQL query - dinamički naziv tabele
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

    console.log("📝 Izvršavanje SQL query-ja...");
    const result = await pool.request().query(query);
    const erpProducts: ErpProduct[] = result.recordset;

    console.log(`📦 Pronađeno ${erpProducts.length} proizvoda u ERP bazi`);

    if (erpProducts.length === 0) {
      console.warn("⚠️ Nije pronađen nijedan proizvod u ERP bazi!");
      return {
        total: 0,
        created: 0,
        updated: 0,
        errors: 0,
      };
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Sinkronizuj svaki proizvod
    for (const erpProduct of erpProducts) {
      try {
        if (!erpProduct.SKU || !erpProduct.Name) {
          console.warn(`⚠️ Preskačem proizvod bez SKU ili naziva`);
          continue;
        }

        
       

        // Upsert proizvod (update ako postoji po SKU, create ako ne postoji)
        const product = await prisma.product.upsert({
          where: { sku: erpProduct.SKU },
          update: {
            name: erpProduct.Name,
            catalogNumber: erpProduct.CatalogNumber || null,
            stock: Math.max(0, Number(erpProduct.Stock) || 0),
            price: erpProduct.Price ? Number(erpProduct.Price) : null,
            updatedAt: new Date(),
          },
          create: {
            sku: erpProduct.SKU,
            name: erpProduct.Name,
            catalogNumber: erpProduct.CatalogNumber || null,
            stock: Math.max(0, Number(erpProduct.Stock) || 0),
            price: erpProduct.Price ? Number(erpProduct.Price) : null,
          },
        });

        if (product.createdAt.getTime() === product.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`❌ Greška pri sinkronizaciji proizvoda ${erpProduct.SKU}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ Sinkronizacija završena: ${created} kreirano, ${updated} ažurirano, ${errors} grešaka`);

    return {
      total: erpProducts.length,
      created,
      updated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Kritična greška pri sinkronizaciji:", error);
    throw error;
  }
}
