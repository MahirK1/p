import { prisma } from "@/lib/prisma";
import { getErpProducts, type ErpProduct } from "@/lib/erp-db";

export async function syncProducts() {
  console.log("🔄 Počinje sinkronizacija proizvoda iz ERP baze preko API Gateway-a...");

  try {
    // Učitaj naziv tabele iz settings-a (za referencu)
    const tableSetting = await prisma.appSetting.findUnique({
      where: { key: "erp_lager_table" },
    });
    
    // Default vrijednost ako setting ne postoji
    const tableName = tableSetting?.value || "ITAL_IMELBIS_2025";
    
    console.log(`📊 Koristi se tabela: ${tableName}`);
    console.log("📡 Povezivanje sa API Gateway serverom...");

    // Dohvati proizvode preko API Gateway-a
    const erpProducts: ErpProduct[] = await getErpProducts();

    console.log(`📦 Pronađeno ${erpProducts.length} proizvoda u ERP bazi preko API Gateway-a`);

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
