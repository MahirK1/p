import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || user.role !== "COMMERCIAL") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);

  const orders = await prisma.order.findMany({
    where: {
      commercialId: user.id,
      createdAt: { gte: from, lte: to },
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              brand: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalSales = orders.reduce((sum: number, o: { totalAmount: any; }) => sum + Number(o.totalAmount), 0);

  // Prodaja po brandovima
  const salesByBrand = new Map<string | null, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const brandId = item.product.brand?.id || null;
      const lineTotal = Number(item.lineTotal);
      salesByBrand.set(brandId, (salesByBrand.get(brandId) || 0) + lineTotal);
    }
  }

  // Konvertuj u array format
  const salesByBrandArray = Array.from(salesByBrand.entries()).map(([brandId, amount]) => ({
    brandId,
    amount,
  }));

  // Graf prodaje po danima
  const salesByDayMap = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(key, (salesByDayMap.get(key) ?? 0) + Number(o.totalAmount));
  }
  const salesByDay = Array.from(salesByDayMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  // Broj urađenih posjeta
  const visitsCount = await prisma.visit.count({
    where: {
      commercialId: user.id,
      scheduledAt: { gte: from, lte: to },
      status: "DONE",
    },
  });

  return NextResponse.json({
    year,
    month,
    totalSales,
    salesByDay,
    salesByBrand: salesByBrandArray,
    visitsCount,
  });
}