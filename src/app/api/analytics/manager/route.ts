import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !["MANAGER", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const commercialId = searchParams.get("commercialId") || null;

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);

  // Prethodni period za poređenje
  const prevFrom = new Date(year, month - 2, 1);
  const prevTo = new Date(year, month - 1, 0, 23, 59, 59);

  // Filter za komercijalistu
  const commercialFilter = commercialId ? { commercialId } : {};

  // Narudžbe - trenutni period
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ["APPROVED", "COMPLETED"] },
      ...commercialFilter,
    },
    include: {
      items: {
        include: {
          product: { include: { brand: true } },
        },
      },
      commercial: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      visit: {
        select: {
          id: true,
          scheduledAt: true,
        },
      },
    },
  });

  // Narudžbe - prethodni period
  const prevOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: prevFrom, lte: prevTo },
      status: { in: ["APPROVED", "COMPLETED"] },
      ...commercialFilter,
    },
    include: {
      items: {
        include: {
          product: { include: { brand: true } },
        },
      },
    },
  });

  // Posjete - trenutni period
  const visits = await prisma.visit.findMany({
    where: {
      scheduledAt: { gte: from, lte: to },
      ...commercialFilter,
    },
    include: {
      commercial: {
        select: {
          id: true,
          name: true,
        },
      },
      orders: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  // Osnovne metrike
  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const prevTotalSales = prevOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalOrders = orders.length;
  const prevTotalOrders = prevOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;

  // Prodaja po danima
  const salesByDayMap = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(key, (salesByDayMap.get(key) ?? 0) + Number(o.totalAmount));
  }
  const salesByDay = Array.from(salesByDayMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Aktivnost po danima u sedmici
  const salesByWeekday = new Map<number, { amount: number; orders: number; visits: number }>();
  for (const o of orders) {
    const weekday = new Date(o.createdAt).getDay();
    const existing = salesByWeekday.get(weekday) ?? { amount: 0, orders: 0, visits: 0 };
    existing.amount += Number(o.totalAmount);
    existing.orders += 1;
    salesByWeekday.set(weekday, existing);
  }
  for (const visit of visits) {
    const weekday = new Date(visit.scheduledAt).getDay();
    const existing = salesByWeekday.get(weekday) ?? { amount: 0, orders: 0, visits: 0 };
    existing.visits += 1;
    salesByWeekday.set(weekday, existing);
  }
  const salesByWeekdayArray = Array.from(salesByWeekday.entries())
    .map(([day, data]) => ({ day, ...data }))
    .sort((a, b) => a.day - b.day);

  // Aktivnost po satima
  const salesByHour = new Map<number, { amount: number; orders: number }>();
  for (const o of orders) {
    const hour = new Date(o.createdAt).getHours();
    const existing = salesByHour.get(hour) ?? { amount: 0, orders: 0 };
    existing.amount += Number(o.totalAmount);
    existing.orders += 1;
    salesByHour.set(hour, existing);
  }
  const salesByHourArray = Array.from(salesByHour.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour - b.hour);

  // Top proizvodi
  const productSalesMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      brand: string;
      quantity: number;
      amount: number;
      orders: number;
    }
  >();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.productId;
      const existing = productSalesMap.get(key) ?? {
        productId: item.productId,
        productName: item.product.name,
        brand: item.product.brand?.name ?? "Ostalo",
        quantity: 0,
        amount: 0,
        orders: 0,
      };
      existing.quantity += item.quantity;
      existing.amount += Number(item.lineTotal);
      existing.orders += 1;
      productSalesMap.set(key, existing);
    }
  }
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  // Prodaja po brendu
  const salesByBrandMap = new Map<string, { brand: string; amount: number; orders: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const brandName = item.product.brand?.name ?? "Ostalo";
      const amount = Number(item.lineTotal);
      const existing = salesByBrandMap.get(brandName) ?? {
        brand: brandName,
        amount: 0,
        orders: 0,
      };
      existing.amount += amount;
      if (!salesByBrandMap.has(brandName)) {
        existing.orders = 1;
      }
      salesByBrandMap.set(brandName, existing);
    }
  }
  const salesByBrand = Array.from(salesByBrandMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  // Prodaja po komercijalisti - sa detaljima
  const salesByCommercialMap = new Map<
    string,
    {
      commercialId: string;
      commercial: string;
      amount: number;
      ordersCount: number;
      visitsCount: number;
      visitsDone: number;
      visitsWithOrders: number;
      avgOrderValue: number;
      avgDaysToOrder: number;
    }
  >();

  for (const o of orders) {
    const key = o.commercialId;
    const existing =
      salesByCommercialMap.get(key) ?? {
        commercialId: o.commercialId,
        commercial: o.commercial.name,
        amount: 0,
        ordersCount: 0,
        visitsCount: 0,
        visitsDone: 0,
        visitsWithOrders: 0,
        avgOrderValue: 0,
        avgDaysToOrder: 0,
      };
    existing.amount += Number(o.totalAmount);
    existing.ordersCount += 1;
    salesByCommercialMap.set(key, existing);
  }

  // Statistike posjeta po komercijalisti
  for (const visit of visits) {
    const existing = salesByCommercialMap.get(visit.commercialId);
    if (existing) {
      existing.visitsCount += 1;
      if (visit.status === "DONE") {
        existing.visitsDone += 1;
      }
      if (visit.orders.length > 0) {
        existing.visitsWithOrders += 1;
      }
    }
  }

  // Prosječno vrijeme između posjete i narudžbe
  for (const order of orders) {
    if (order.visit) {
      const existing = salesByCommercialMap.get(order.commercialId);
      if (existing) {
        const daysDiff =
          (new Date(order.createdAt).getTime() -
            new Date(order.visit.scheduledAt).getTime()) /
          (1000 * 60 * 60 * 24);
        const currentAvg = existing.avgDaysToOrder;
        const count = existing.ordersCount;
        existing.avgDaysToOrder = currentAvg === 0 
          ? daysDiff 
          : (currentAvg * (count - 1) + daysDiff) / count;
      }
    }
  }

  // Izračunaj prosječnu vrijednost narudžbe
  salesByCommercialMap.forEach((value) => {
    value.avgOrderValue = value.ordersCount > 0 ? value.amount / value.ordersCount : 0;
  });

  const salesByCommercial = Array.from(salesByCommercialMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  // Performance ranking
  const performanceRanking = salesByCommercial
    .map((com) => ({
      ...com,
      conversionRate:
        com.visitsDone > 0 ? (com.visitsWithOrders / com.visitsDone) * 100 : 0,
      visitCompletionRate:
        com.visitsCount > 0 ? (com.visitsDone / com.visitsCount) * 100 : 0,
      score:
        (com.amount / 1000) * 0.4 + // Prodaja (40%)
        com.ordersCount * 10 * 0.2 + // Broj narudžbi (20%)
        (com.visitsDone / com.visitsCount || 0) * 100 * 0.2 + // Realizacija posjeta (20%)
        ((com.visitsWithOrders / com.visitsDone) * 100 || 0) * 0.2, // Konverzija (20%)
    }))
    .sort((a, b) => b.score - a.score)
    .map((com, idx) => ({ ...com, rank: idx + 1 }));

  // Top klijenti (po prodaji)
  const salesByClientMap = new Map<
    string,
    { clientId: string; client: string; amount: number; ordersCount: number }
  >();
  for (const o of orders) {
    const key = o.clientId;
    const existing =
      salesByClientMap.get(key) ?? {
        clientId: o.clientId,
        client: o.client.name,
        amount: 0,
        ordersCount: 0,
      };
    existing.amount += Number(o.totalAmount);
    existing.ordersCount += 1;
    salesByClientMap.set(key, existing);
  }
  const topClients = Array.from(salesByClientMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Statistike posjeta
  const visitsPlanned = visits.filter((v) => v.status === "PLANNED").length;
  const visitsDone = visits.filter((v) => v.status === "DONE").length;
  const visitsCanceled = visits.filter((v) => v.status === "CANCELED").length;
  const visitsTotal = visits.length;

  // Konverzija posjeta u narudžbe
  const visitsWithOrders = visits.filter((v) => v.orders.length > 0).length;
  const conversionRate =
    visitsDone > 0 ? (visitsWithOrders / visitsDone) * 100 : 0;

  // Posjete po danima
  const visitsByDayMap = new Map<string, { planned: number; done: number }>();
  for (const visit of visits) {
    const key = visit.scheduledAt.toISOString().slice(0, 10);
    const existing = visitsByDayMap.get(key) ?? { planned: 0, done: 0 };
    if (visit.status === "PLANNED") existing.planned += 1;
    if (visit.status === "DONE") existing.done += 1;
    visitsByDayMap.set(key, existing);
  }
  const visitsByDay = Array.from(visitsByDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Planovi i achievement (ako postoje)
  const plans = await prisma.plan.findMany({
    where: {
      year,
      month,
    },
    include: {
      brand: true,
      assignments: {
        include: {
          commercial: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Achievement po komercijalisti
  const achievementByCommercial = new Map<
    string,
    {
      commercialId: string;
      commercial: string;
      target: number;
      achieved: number;
      percentage: number;
      planId?: string;
    }
  >();

  for (const plan of plans) {
    const planOrders = orders.filter((o) => {
      if (plan.brandId) {
        return o.items.some((item) => item.product.brandId === plan.brandId);
      }
      return true;
    });

    for (const assignment of plan.assignments) {
      const commercialOrders = planOrders.filter(
        (o) => o.commercialId === assignment.commercialId
      );
      let achieved = 0;
      for (const order of commercialOrders) {
        for (const item of order.items) {
          if (plan.brandId && item.product.brandId !== plan.brandId) continue;
          achieved += Number(item.lineTotal);
        }
      }

      const target = Number(assignment.target);
      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      const key = `${assignment.commercialId}-${plan.id}`;
      achievementByCommercial.set(key, {
        commercialId: assignment.commercialId,
        commercial: assignment.commercial.name,
        target,
        achieved,
        percentage,
        planId: plan.id,
      });
    }
  }

  return NextResponse.json({
    year,
    month,
    // Osnovne metrike
    totalSales,
    totalOrders,
    avgOrderValue,
    visitsTotal,
    visitsPlanned,
    visitsDone,
    visitsCanceled,
    conversionRate,
    visitsWithOrders,
    // Poređenje sa prethodnim periodom
    previousPeriod: {
      totalSales: prevTotalSales,
      totalOrders: prevTotalOrders,
      avgOrderValue: prevAvgOrderValue,
      salesChange:
        prevTotalSales > 0
          ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
          : 0,
      ordersChange:
        prevTotalOrders > 0
          ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100
          : 0,
    },
    // Grafikoni
    salesByDay,
    visitsByDay,
    salesByWeekday: salesByWeekdayArray,
    salesByHour: salesByHourArray,
    // Tabele
    salesByBrand,
    topProducts,
    salesByCommercial,
    performanceRanking,
    topClients,
    achievementByCommercial: Array.from(achievementByCommercial.values()),
  });
}