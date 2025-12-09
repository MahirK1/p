import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Provjeri API key
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.SYNC_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { products, tableName } = body;

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "products mora biti niz" },
        { status: 400 }
      );
    }

    // Ažuriraj naziv tabele u settings ako je proslijeđen
    if (tableName) {
      await prisma.appSetting.upsert({
        where: { key: "erp_lager_table" },
        update: { value: tableName },
        create: { key: "erp_lager_table", value: tableName },
      });
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const erpProduct of products) {
      try {
        if (!erpProduct.SKU || !erpProduct.Name) {
          console.warn(`⚠️ Preskačem proizvod bez SKU ili naziva`);
          continue;
        }

        // Provjeri da li brand postoji, ako ne, kreiraj ga
        let brandId: string | null = null;
        if (erpProduct.Brand) {
          const brand = await prisma.brand.upsert({
            where: { name: erpProduct.Brand },
            update: {},
            create: { name: erpProduct.Brand },
          });
          brandId = brand.id;
        }

        // Upsert proizvod
        const product = await prisma.product.upsert({
          where: { sku: erpProduct.SKU },
          update: {
            name: erpProduct.Name,
            catalogNumber: erpProduct.CatalogNumber || null,
            stock: Math.max(0, Number(erpProduct.Stock) || 0),
            price: erpProduct.Price ? Number(erpProduct.Price) : null,
            description: erpProduct.Description || null,
            brandId: brandId,
            updatedAt: new Date(),
          },
          create: {
            sku: erpProduct.SKU,
            name: erpProduct.Name,
            catalogNumber: erpProduct.CatalogNumber || null,
            stock: Math.max(0, Number(erpProduct.Stock) || 0),
            price: erpProduct.Price ? Number(erpProduct.Price) : null,
            description: erpProduct.Description || null,
            brandId: brandId,
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

    return NextResponse.json({
      success: true,
      stats: {
        total: products.length,
        created,
        updated,
        errors,
      },
    });
  } catch (error: any) {
    console.error("❌ Greška pri primanju proizvoda:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Greška pri primanju proizvoda",
      },
      { status: 500 }
    );
  }
}
