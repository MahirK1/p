import { prisma } from "@/lib/prisma";
import { getErpBranches, type ErpBranch } from "@/lib/erp-db";

export async function syncBranches() {
  console.log("🔄 Počinje sinkronizacija lokacija/podružnica iz ERP baze preko API Gateway-a...");

  try {
    console.log("📡 Povezivanje sa API Gateway serverom...");

    // Dohvati podružnice preko API Gateway-a
    const erpBranches: ErpBranch[] = await getErpBranches();

    console.log(`📦 Pronađeno ${erpBranches.length} lokacija u ERP bazi preko API Gateway-a`);

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