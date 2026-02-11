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
      client: {
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

  // ========== NOVE ANALITIKE - VISOKI PRIORITET ==========
  
  // 1. Trend analiza (posljednjih 6 mjeseci)
  const trendMonths: Array<{ month: number; year: number; sales: number; orders: number; visits: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const trendDate = new Date(year, month - 1 - i, 1);
    const trendYear = trendDate.getFullYear();
    const trendMonth = trendDate.getMonth() + 1;
    const trendFrom = new Date(trendYear, trendMonth - 1, 1);
    const trendTo = new Date(trendYear, trendMonth, 0, 23, 59, 59);
    
    const trendOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: trendFrom, lte: trendTo },
        status: { in: ["APPROVED", "COMPLETED"] },
        ...commercialFilter,
      },
    });
    
    const trendVisits = await prisma.visit.findMany({
      where: {
        scheduledAt: { gte: trendFrom, lte: trendTo },
        ...commercialFilter,
      },
    });
    
    const trendSales = trendOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    trendMonths.push({
      month: trendMonth,
      year: trendYear,
      sales: trendSales,
      orders: trendOrders.length,
      visits: trendVisits.length,
    });
  }

  // 2. Novi vs postojeći klijenti
  // Novi klijent = prva narudžba u trenutnom periodu
  const allClientOrders = await prisma.order.findMany({
    where: {
      status: { in: ["APPROVED", "COMPLETED"] },
      ...commercialFilter,
    },
    select: {
      clientId: true,
      createdAt: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "asc" },
  });
  
  const firstOrderByClient = new Map<string, Date>();
  for (const order of allClientOrders) {
    if (!firstOrderByClient.has(order.clientId)) {
      firstOrderByClient.set(order.clientId, order.createdAt);
    }
  }
  
  let newClientsCount = 0;
  let newClientsSales = 0;
  let existingClientsCount = 0;
  let existingClientsSales = 0;
  
  for (const order of orders) {
    const firstOrderDate = firstOrderByClient.get(order.clientId);
    if (firstOrderDate && firstOrderDate >= from && firstOrderDate <= to) {
      // Novi klijent
      newClientsCount++;
      newClientsSales += Number(order.totalAmount);
    } else {
      // Postojeći klijent
      existingClientsCount++;
      existingClientsSales += Number(order.totalAmount);
    }
  }
  
  const newClients = Array.from(new Set(
    orders
      .filter((o) => {
        const firstOrderDate = firstOrderByClient.get(o.clientId);
        return firstOrderDate && firstOrderDate >= from && firstOrderDate <= to;
      })
      .map((o) => o.clientId)
  )).length;

  // 3. Churn analiza (klijenti bez narudžbi u posljednjih 3 mjeseca) - optimizovano
  // PRIKAZUJE SAMO KLIJENTE KOJI SU IMALI BAREM JEDNU NARUDŽBU
  const churnThreshold = new Date(year, month - 1 - 3, 1);
  
  // Uzmi sve klijente koji su imali narudžbe
  const clientsWithOrders = await prisma.order.findMany({
    where: {
      status: { in: ["APPROVED", "COMPLETED"] },
      ...commercialFilter,
    },
    select: {
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  
  // Pronađi posljednju narudžbu po klijentu
  const lastOrderByClient = new Map<string, { clientId: string; client: string; lastOrderDate: Date; firstOrderDate: Date }>();
  const firstOrderByClientChurn = new Map<string, Date>();
  
  for (const order of clientsWithOrders) {
    if (!lastOrderByClient.has(order.clientId)) {
      lastOrderByClient.set(order.clientId, {
        clientId: order.clientId,
        client: order.client.name,
        lastOrderDate: order.createdAt,
        firstOrderDate: order.createdAt,
      });
      firstOrderByClientChurn.set(order.clientId, order.createdAt);
    } else {
      const existing = lastOrderByClient.get(order.clientId)!;
      if (order.createdAt > existing.lastOrderDate) {
        existing.lastOrderDate = order.createdAt;
      }
      if (order.createdAt < existing.firstOrderDate) {
        existing.firstOrderDate = order.createdAt;
      }
      const firstDate = firstOrderByClientChurn.get(order.clientId)!;
      if (order.createdAt < firstDate) {
        firstOrderByClientChurn.set(order.clientId, order.createdAt);
      }
    }
  }
  
  // Sada uzmi samo klijente koji su imali barem jednu narudžbu (ne sve klijente)
  const churnedClients: Array<{ clientId: string; client: string; lastOrderDate: Date; firstOrderDate: Date; monthsSinceLastOrder: number }> = [];
  const nowChurn = new Date();
  
  for (const [clientId, orderInfo] of lastOrderByClient.entries()) {
    const lastOrderDate = orderInfo.lastOrderDate;
    const firstOrderDate = firstOrderByClientChurn.get(clientId) || lastOrderDate;
    
    // Klijent je u riziku ako nije imao narudžbu u posljednjih 3 mjeseca
    if (lastOrderDate < churnThreshold) {
      const monthsSince = Math.floor((nowChurn.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      churnedClients.push({
        clientId: orderInfo.clientId,
        client: orderInfo.client,
        lastOrderDate: lastOrderDate,
        firstOrderDate: firstOrderDate,
        monthsSinceLastOrder: monthsSince,
      });
    }
  }
  
  // Sortiraj po mjesecima bez narudžbe (najduže prvo) i uzmi top 50
  churnedClients.sort((a, b) => b.monthsSinceLastOrder - a.monthsSinceLastOrder);
  const topChurnedClients = churnedClients.slice(0, 50);

  // 4. Razlog otkazivanja posjeta
  const cancellationReasons: Array<{ reason: string; count: number }> = [];
  const cancellationReasonMap = new Map<string, number>();
  
  for (const visit of visits) {
    if (visit.status === "CANCELED" && visit.note) {
      // Parsiranje razloga iz napomene (format: "--- RAZLOG OTKAZIVANJA ---\n{razlog}")
      const reasonMatch = visit.note.match(/---\s*RAZLOG\s*OTKAZIVANJA\s*---\s*\n(.+?)(?:\n\n|$)/i);
      if (reasonMatch) {
        const reason = reasonMatch[1].trim();
        cancellationReasonMap.set(reason, (cancellationReasonMap.get(reason) || 0) + 1);
      }
    }
  }
  
  for (const [reason, count] of cancellationReasonMap.entries()) {
    cancellationReasons.push({ reason, count });
  }
  cancellationReasons.sort((a, b) => b.count - a.count);

  // 5. Posjete bez narudžbi (missed opportunities)
  const visitsWithoutOrders: Array<{
    visitId: string;
    clientId: string;
    clientName: string;
    commercialId: string;
    commercialName: string;
    scheduledAt: Date;
    note: string | null;
  }> = [];
  
  for (const visit of visits) {
    if (visit.status === "DONE") {
      // Provjeri da li postoji narudžba u narednih 7 dana
      const visitDate = new Date(visit.scheduledAt);
      const checkUntil = new Date(visitDate);
      checkUntil.setDate(checkUntil.getDate() + 7);
      
      const hasOrder = orders.some((o) => {
        const orderDate = new Date(o.createdAt);
        return (
          o.clientId === visit.clientId &&
          orderDate >= visitDate &&
          orderDate <= checkUntil
        );
      });
      
      if (!hasOrder) {
        visitsWithoutOrders.push({
          visitId: visit.id,
          clientId: visit.clientId,
          clientName: visit.client.name,
          commercialId: visit.commercialId,
          commercialName: visit.commercial.name,
          scheduledAt: visit.scheduledAt,
          note: visit.note,
        });
      }
    }
  }

  // 6. Apoteke koje nisu posjećene 3+ mjeseca
  const threeMonthsAgo = new Date(year, month - 1 - 3, 1);
  const now = new Date();

// 1. Dohvati sve klijente i njihove poslovnice
const allClients = await prisma.client.findMany({
  include: {
    branches: true, // Dohvaćamo sve poslovnice za svakog klijenta
  },
});

// 2. Dohvati sve završene posjete (za mapiranje zadnje posjete)
const allVisits = await prisma.visit.findMany({
  where: {
    status: "DONE",
    ...commercialFilter,
  },
  include: {
    branches: {
      include: {
        branch: true
      }
    },
    commercial: {
      select: { id: true, name: true }
    }
  },
  orderBy: { scheduledAt: "desc" },
});

// 3. Mapiranje zadnje posjete (ključ može biti clientId ili branchId)
const lastVisitMap = new Map<string, { date: Date; commId: string; commName: string }>();

for (const visit of allVisits) {
  // Ako posjeta ima poslovnice, mapiraj po branchId
  if (visit.branches.length > 0) {
    for (const vb of visit.branches) {
      if (!lastVisitMap.has(vb.branchId)) {
        lastVisitMap.set(vb.branchId, {
          date: visit.scheduledAt,
          commId: visit.commercialId,
          commName: visit.commercial.name
        });
      }
    }
  } else {
    // Ako posjeta NEMA poslovnice, vežemo je direktno za klijenta
    if (!lastVisitMap.has(visit.clientId)) {
      lastVisitMap.set(visit.clientId, {
        date: visit.scheduledAt,
        commId: visit.commercialId,
        commName: visit.commercial.name
      });
    }
  }
}

// 4. Kreiranje finalne liste (Klijenti + Poslovnice)
const unvisitedEntities: any[] = [];

for (const client of allClients) {
  // Ako klijent NEMA poslovnice, tretiraj njega kao lokaciju
  if (client.branches.length === 0) {
    const lastVisit = lastVisitMap.get(client.id);
    const lastDate = lastVisit?.date || null;

    if (!lastDate || lastDate < threeMonthsAgo) {
      unvisitedEntities.push(formatEntry(client, null, lastVisit));
    }
  } else {
    // Ako klijent IMA poslovnice, prođi kroz svaku
    for (const branch of client.branches) {
      const lastVisit = lastVisitMap.get(branch.id);
      const lastDate = lastVisit?.date || null;

      if (!lastDate || lastDate < threeMonthsAgo) {
        unvisitedEntities.push(formatEntry(client, branch, lastVisit));
      }
    }
  }
}

// Pomoćna funkcija za formatiranje unosa
function formatEntry(client: any, branch: any | null, lastVisit: any) {
  const lastDate = lastVisit?.date || null;
  const months = lastDate 
    ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) 
    : 999;

  return {
    id: branch ? branch.id : client.id,
    displayName: branch ? `${client.name} - ${branch.name}` : `${client.name} (Sjedište/Klijent)`,
    clientName: client.name,
    branchName: branch ? branch.name : "Nema poslovnice",
    lastVisitDate: lastDate,
    monthsSinceLastVisit: months,
    commercialName: lastVisit?.commName || "Nema podataka"
  };
}

// 5. Sortiranje i top 100
unvisitedEntities.sort((a, b) => b.monthsSinceLastVisit - a.monthsSinceLastVisit);
const topResults = unvisitedEntities.slice(0, 100);

  // ========== ANALITIKE SREDNJEG PRIORITETA ==========
  
  // 6. Customer Lifetime Value (CLV)
  const clientLifetimeValue: Array<{
    clientId: string;
    client: string;
    totalOrders: number;
    totalSales: number;
    firstOrderDate: Date;
    lastOrderDate: Date;
    avgOrderValue: number;
  }> = [];
  
  const clvMap = new Map<string, {
    clientId: string;
    client: string;
    orders: number;
    sales: number;
    firstOrder: Date;
    lastOrder: Date;
  }>();
  
  // Uzmi sve narudžbe za sve klijente (ne samo trenutni period)
  const allOrdersForCLV = await prisma.order.findMany({
    where: {
      status: { in: ["APPROVED", "COMPLETED"] },
      ...commercialFilter,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  
  for (const order of allOrdersForCLV) {
    const key = order.clientId;
    const existing = clvMap.get(key) || {
      clientId: order.clientId,
      client: order.client.name,
      orders: 0,
      sales: 0,
      firstOrder: order.createdAt,
      lastOrder: order.createdAt,
    };
    existing.orders++;
    existing.sales += Number(order.totalAmount);
    if (order.createdAt < existing.firstOrder) existing.firstOrder = order.createdAt;
    if (order.createdAt > existing.lastOrder) existing.lastOrder = order.createdAt;
    clvMap.set(key, existing);
  }
  
  for (const [key, data] of clvMap.entries()) {
    clientLifetimeValue.push({
      clientId: data.clientId,
      client: data.client,
      totalOrders: data.orders,
      totalSales: data.sales,
      firstOrderDate: data.firstOrder,
      lastOrderDate: data.lastOrder,
      avgOrderValue: data.orders > 0 ? data.sales / data.orders : 0,
    });
  }
  
  clientLifetimeValue.sort((a, b) => b.totalSales - a.totalSales);
  const topCLVClients = clientLifetimeValue.slice(0, 20);

  // 7. Proizvodi u padu/rastu
  const prevProductSales = new Map<string, number>();
  const currentProductSales = new Map<string, { productId: string; productName: string; brand: string; amount: number }>();
  
  // Prethodni period - prodaja po proizvodu
  for (const order of prevOrders) {
    for (const item of order.items) {
      const key = item.productId;
      prevProductSales.set(key, (prevProductSales.get(key) || 0) + Number(item.lineTotal));
    }
  }
  
  // Trenutni period - prodaja po proizvodu
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      const existing = currentProductSales.get(key) || {
        productId: item.productId,
        productName: item.product.name,
        brand: item.product.brand?.name || "Bez brenda",
        amount: 0,
      };
      existing.amount += Number(item.lineTotal);
      currentProductSales.set(key, existing);
    }
  }
  
  const productsTrending: Array<{
    productId: string;
    productName: string;
    brand: string;
    currentAmount: number;
    previousAmount: number;
    change: number;
    changePercent: number;
  }> = [];
  
  for (const [productId, currentData] of currentProductSales.entries()) {
    const prevAmount = prevProductSales.get(productId) || 0;
    const change = currentData.amount - prevAmount;
    const changePercent = prevAmount > 0 ? (change / prevAmount) * 100 : (currentData.amount > 0 ? 100 : 0);
    
    productsTrending.push({
      productId: currentData.productId,
      productName: currentData.productName,
      brand: currentData.brand,
      currentAmount: currentData.amount,
      previousAmount: prevAmount,
      change,
      changePercent,
    });
  }
  
  const productsGrowing = productsTrending
    .filter(p => p.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10);
  
  const productsDeclining = productsTrending
    .filter(p => p.change < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10);

  // 8. Aktivnost komercijalista (heatmap) - kalendarski prikaz
  // Uzmi sve komercijaliste
  const allCommercials = await prisma.user.findMany({
    where: {
      role: "COMMERCIAL",
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  const commercialActivityHeatmap: Array<{
    commercialId: string;
    commercial: string;
    activityByDate: Array<{ date: string; visits: number; orders: number; totalActivity: number }>;
  }> = [];
  
  // Grupiši aktivnost po komercijalisti i datumu
  const activityMap = new Map<string, Map<string, { visits: number; orders: number }>>();
  
  for (const visit of visits) {
    const key = visit.commercialId;
    const dateKey = visit.scheduledAt.toISOString().slice(0, 10);
    if (!activityMap.has(key)) {
      activityMap.set(key, new Map());
    }
    const dateMap = activityMap.get(key)!;
    const existing = dateMap.get(dateKey) || { visits: 0, orders: 0 };
    existing.visits++;
    dateMap.set(dateKey, existing);
  }
  
  for (const order of orders) {
    const key = order.commercialId;
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    if (!activityMap.has(key)) {
      activityMap.set(key, new Map());
    }
    const dateMap = activityMap.get(key)!;
    const existing = dateMap.get(dateKey) || { visits: 0, orders: 0 };
    existing.orders++;
    dateMap.set(dateKey, existing);
  }
  
  // Konvertuj u format za heatmap
  for (const [commercialId, dateMap] of activityMap.entries()) {
    const commercial = allCommercials.find(c => c.id === commercialId) || { id: commercialId, name: "Nepoznato" };
    const activityByDate: Array<{ date: string; visits: number; orders: number; totalActivity: number }> = [];
    
    for (const [date, data] of dateMap.entries()) {
      activityByDate.push({
        date,
        visits: data.visits,
        orders: data.orders,
        totalActivity: data.visits + data.orders,
      });
    }
    
    activityByDate.sort((a, b) => a.date.localeCompare(b.date));
    
    commercialActivityHeatmap.push({
      commercialId: commercial.id,
      commercial: commercial.name,
      activityByDate,
    });
  }

  // 10. Funnel analiza (posjete → narudžbe)
  const funnelAnalysis = {
    plannedVisits: visitsPlanned,
    doneVisits: visitsDone,
    visitsWithOrders: visitsWithOrders,
    approvedOrders: orders.filter(o => o.status === "APPROVED").length,
    completedOrders: orders.filter(o => o.status === "COMPLETED").length,
    conversionRates: {
      plannedToDone: visitsTotal > 0 ? (visitsDone / visitsTotal) * 100 : 0,
      doneToOrder: visitsDone > 0 ? (visitsWithOrders / visitsDone) * 100 : 0,
      orderToApproved: orders.length > 0 ? (orders.filter(o => o.status === "APPROVED").length / orders.length) * 100 : 0,
      approvedToCompleted: orders.filter(o => o.status === "APPROVED").length > 0
        ? (orders.filter(o => o.status === "COMPLETED").length / orders.filter(o => o.status === "APPROVED").length) * 100
        : 0,
    },
  };

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

  // 9. KPI Dashboard sa targetima - NAKON što je achievementByCommercial definisan
  const achievementArray = Array.from(achievementByCommercial.values());
  const kpiDashboard = {
    sales: {
      current: totalSales,
      target: achievementArray.reduce((sum, a) => sum + a.target, 0),
      achieved: achievementArray.reduce((sum, a) => sum + a.achieved, 0),
      percentage: achievementArray.reduce((sum, a) => sum + a.target, 0) > 0
        ? (achievementArray.reduce((sum, a) => sum + a.achieved, 0) / achievementArray.reduce((sum, a) => sum + a.target, 0)) * 100
        : 0,
    },
    orders: {
      current: totalOrders,
      target: 0, // Možemo dodati target za narudžbe ako postoji
      achieved: totalOrders,
      percentage: 0,
    },
    visits: {
      current: visitsDone,
      target: visitsTotal,
      achieved: visitsDone,
      percentage: visitsTotal > 0 ? (visitsDone / visitsTotal) * 100 : 0,
    },
    conversion: {
      current: conversionRate,
      target: 50, // Default target 50%
      achieved: conversionRate,
      percentage: (conversionRate / 50) * 100,
    },
  };

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
    achievementByCommercial: achievementArray,
    // NOVE ANALITIKE - VISOKI PRIORITET
    trendAnalysis: trendMonths,
    newVsExistingClients: {
      newClients: newClients,
      newClientsCount: newClientsCount,
      newClientsSales: newClientsSales,
      existingClientsCount: existingClientsCount,
      existingClientsSales: existingClientsSales,
    },
    churnedClients: topChurnedClients,
    cancellationReasons: cancellationReasons,
    visitsWithoutOrders: visitsWithoutOrders,
    unvisitedBranches: topResults,
    // ANALITIKE SREDNJEG PRIORITETA
    customerLifetimeValue: topCLVClients,
    productsTrending: {
      growing: productsGrowing,
      declining: productsDeclining,
    },
    commercialActivityHeatmap: commercialActivityHeatmap,
    kpiDashboard: kpiDashboard,
    funnelAnalysis: funnelAnalysis,
  });
}