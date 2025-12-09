import { prisma } from "@/lib/prisma";
import { getErpConnection } from "@/lib/erp-db";
import sql from "mssql";

export async function syncBranches() {
  console.log("🔄 Počinje sinkronizacija lokacija/podružnica iz ERP baze...");

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await getErpConnection();

    // SQL query za lokacije - samo aktivne (Skriven = 0 ili NULL)
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
        [ITAL_REGISTRI_IMELBISR_].[dbo].[RjPartnera] rj
      WHERE 
        (rj.Skriven = 0 OR rj.Skriven IS NULL)
      ORDER BY 
        rj.PartnerId, rj.Naziv
    `;

    console.log("📝 Izvršavanje SQL query-ja za lokacije...");
    const result = await pool.request().query(query);
    const erpBranches = result.recordset;

    console.log(`📦 Pronađeno ${erpBranches.length} lokacija u ERP bazi`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;

    for (const erpBranch of erpBranches) {
      try {
        if (!erpBranch.ERP_ID || !erpBranch.Name || !erpBranch.PartnerERP_ID) {
          console.warn(`⚠️ Preskačem lokaciju bez ERP_ID, naziva ili PartnerID`);
          skipped++;
          continue;
        }

        // Pronađi klijenta po ERP ID
        const client = await prisma.client.findUnique({
          where: { erpId: String(erpBranch.PartnerERP_ID) },
        });

        if (!client) {
          console.warn(`⚠️ Klijent sa ERP_ID ${erpBranch.PartnerERP_ID} ne postoji, preskačem lokaciju ${erpBranch.Name}`);
          skipped++;
          continue;
        }

        // Upsert lokacija
        const branch = await prisma.clientBranch.upsert({
          where: { erpId: String(erpBranch.ERP_ID) },
          update: {
            name: erpBranch.Name || "Nepoznata lokacija",
            idBroj: erpBranch.IdBroj || null,
            clientId: client.id,
            address: erpBranch.Address || null,
            city: erpBranch.City || null,
            phone: erpBranch.Phone || null,
            email: erpBranch.Email || null,
            contactPerson: erpBranch.ContactPerson || null,
            zipCode: erpBranch.ZipCode || null,
            updatedAt: new Date(),
          },
          create: {
            erpId: String(erpBranch.ERP_ID),
            name: erpBranch.Name || "Nepoznata lokacija",
            idBroj: erpBranch.IdBroj || null,
            clientId: client.id,
            address: erpBranch.Address || null,
            city: erpBranch.City || null,
            phone: erpBranch.Phone || null,
            email: erpBranch.Email || null,
            contactPerson: erpBranch.ContactPerson || null,
            zipCode: erpBranch.ZipCode || null,
          },
        });

        if (branch.createdAt.getTime() === branch.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`❌ Greška pri sinkronizaciji lokacije ${erpBranch.Name}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ Sinkronizacija lokacija završena: ${created} kreirano, ${updated} ažurirano, ${errors} grešaka, ${skipped} preskočeno`);

    return {
      total: erpBranches.length,
      created,
      updated,
      errors,
      skipped,
    };
  } catch (error: any) {
    console.error("❌ Kritična greška pri sinkronizaciji lokacija:", error);
    throw error;
  }
}