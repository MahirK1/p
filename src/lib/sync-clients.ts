import { prisma } from "@/lib/prisma";
import { getErpConnection } from "@/lib/erp-db";
import sql from "mssql";

export async function syncClients() {
  console.log("🔄 Počinje sinkronizacija klijenata iz ERP baze...");

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await getErpConnection();

    // SQL query za klijente - samo aktivni (Neaktivan = 0 ili NULL)
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
        [ITAL_REGISTRI_IMELBISR_].[dbo].[Partner]
      WHERE 
        (Neaktivan = 0 OR Neaktivan IS NULL)
        AND (Skriven = 0 OR Skriven IS NULL)
      ORDER BY 
        IME
    `;

    console.log("📝 Izvršavanje SQL query-ja za klijente...");
    const result = await pool.request().query(query);
    const erpClients = result.recordset;

    console.log(`📦 Pronađeno ${erpClients.length} klijenata u ERP bazi`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const erpClient of erpClients) {
      try {
        if (!erpClient.ERP_ID || !erpClient.Name) {
          console.warn(`⚠️ Preskačem klijenta bez ERP_ID ili naziva`);
          continue;
        }

        // Upsert klijent
        const client = await prisma.client.upsert({
          where: { erpId: String(erpClient.ERP_ID) },
          update: {
            name: erpClient.Name || "Nepoznat klijent",
            matBroj: erpClient.MatBroj || null,
            address: erpClient.Address || null,
            city: erpClient.City || null,
            phone: erpClient.Phone || null,
            email: erpClient.Email || null,
            pdvBroj: erpClient.PdvBroj || null,
            note: erpClient.Note || null,
            updatedAt: new Date(),
          },
          create: {
            erpId: String(erpClient.ERP_ID),
            name: erpClient.Name || "Nepoznat klijent",
            matBroj: erpClient.MatBroj || null,
            address: erpClient.Address || null,
            city: erpClient.City || null,
            phone: erpClient.Phone || null,
            email: erpClient.Email || null,
            pdvBroj: erpClient.PdvBroj || null,
            note: erpClient.Note || null,
          },
        });

        if (client.createdAt.getTime() === client.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`❌ Greška pri sinkronizaciji klijenta ${erpClient.Name}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ Sinkronizacija klijenata završena: ${created} kreirano, ${updated} ažurirano, ${errors} grešaka`);

    return {
      total: erpClients.length,
      created,
      updated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Kritična greška pri sinkronizaciji klijenata:", error);
    throw error;
  }
}
