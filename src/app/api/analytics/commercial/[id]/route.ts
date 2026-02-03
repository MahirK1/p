import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);

  // Komercijalista
  const commercial = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });

  if (!commercial || commercial.id === undefined) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Narudžbe
  const orders = await prisma.order.findMany({
    where: {
      commercialId: id,
      createdAt: { gte: from, lte: to },
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    include: {
      items: {
        include: {
          product: { include: { brand: true } },
        },
      },
      client: { select: { id: true, name: true } },
      visit: { select: { id: true, scheduledAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Posjete
  const visits = await prisma.visit.findMany({
    where: {
      commercialId: id,
      scheduledAt: { gte: from, lte: to },
    },
    include: {
      client: { select: { id: true, name: true } },
      orders: { select: { id: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalOrders = orders.length;
  const visitsDone = visits.filter((v) => v.status === "DONE").length;
  const visitsWithOrders = visits.filter((v) => v.orders.length > 0).length;
  const conversionRate = visitsDone > 0 ? (visitsWithOrders / visitsDone) * 100 : 0;

  // Prodaja po danima
  const salesByDayMap = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(key, (salesByDayMap.get(key) ?? 0) + Number(o.totalAmount));
  }
  const salesByDay = Array.from(salesByDayMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top klijenti
  const clientSalesMap = new Map<string, { clientId: string; client: string; amount: number; orders: number }>();
  for (const o of orders) {
    const key = o.clientId;
    const existing = clientSalesMap.get(key) ?? {
      clientId: o.clientId,
      client: o.client.name,
      amount: 0,
      orders: 0,
    };
    existing.amount += Number(o.totalAmount);
    existing.orders += 1;
    clientSalesMap.set(key, existing);
  }
  const topClients = Array.from(clientSalesMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return NextResponse.json({
    commercial,
    year,
    month,
    totalSales,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    visitsTotal: visits.length,
    visitsDone,
    visitsPlanned: visits.filter((v) => v.status === "PLANNED").length,
    visitsCanceled: visits.filter((v) => v.status === "CANCELED").length,
    conversionRate,
    visitsWithOrders,
    salesByDay,
    topClients,
    orders: orders.slice(0, 50).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      client: o.client.name,
    })),
    visits: visits.slice(0, 50).map((v) => ({
      id: v.id,
      scheduledAt: v.scheduledAt,
      status: v.status,
      client: v.client.name,
      hasOrder: v.orders.length > 0,
    })),
  });
}
