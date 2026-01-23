import { prisma } from "@/lib/prisma";
import { getErpClients, type ErpClient } from "@/lib/erp-db";

export async function syncClients() {
  console.log("🔄 Počinje sinkronizacija klijenata iz ERP baze preko API Gateway-a...");

  try {
    console.log("📡 Povezivanje sa API Gateway serverom...");

    // Dohvati klijente preko API Gateway-a
    const erpClients: ErpClient[] = await getErpClients();

    console.log(`📦 Pronađeno ${erpClients.length} klijenata u ERP bazi preko API Gateway-a`);

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
