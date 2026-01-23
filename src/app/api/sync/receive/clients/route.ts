import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.SYNC_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clients, branches } = body;

    if (!Array.isArray(clients)) {
      return NextResponse.json(
        { error: "clients mora biti niz" },
        { status: 400 }
      );
    }

    let clientsCreated = 0;
    let clientsUpdated = 0;
    let clientsErrors = 0;

    // Sinkronizuj klijente
    for (const erpClient of clients) {
      try {
        if (!erpClient.ERP_ID || !erpClient.Name) {
          console.warn(`⚠️ Preskačem klijenta bez ERP_ID ili naziva`);
          continue;
        }

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
          clientsCreated++;
        } else {
          clientsUpdated++;
        }
      } catch (error: any) {
        console.error(`❌ Greška pri sinkronizaciji klijenta ${erpClient.Name}:`, error.message);
        clientsErrors++;
      }
    }

    // Sinkronizuj podružnice ako su poslane
    let branchesCreated = 0;
    let branchesUpdated = 0;
    let branchesErrors = 0;
    let branchesSkipped = 0;

    if (Array.isArray(branches)) {
      for (const erpBranch of branches) {
        try {
          if (!erpBranch.ERP_ID || !erpBranch.Name || !erpBranch.PartnerERP_ID) {
            branchesSkipped++;
            continue;
          }

          const client = await prisma.client.findUnique({
            where: { erpId: String(erpBranch.PartnerERP_ID) },
          });

          if (!client) {
            branchesSkipped++;
            continue;
          }

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
            branchesCreated++;
          } else {
            branchesUpdated++;
          }
        } catch (error: any) {
          console.error(`❌ Greška pri sinkronizaciji lokacije ${erpBranch.Name}:`, error.message);
          branchesErrors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        clients: {
          total: clients.length,
          created: clientsCreated,
          updated: clientsUpdated,
          errors: clientsErrors,
        },
        branches: {
          total: branches?.length || 0,
          created: branchesCreated,
          updated: branchesUpdated,
          errors: branchesErrors,
          skipped: branchesSkipped,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Greška pri primanju klijenata:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Greška pri primanju klijenata",
      },
      { status: 500 }
    );
  }
}
