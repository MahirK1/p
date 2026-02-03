import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

// Director dashboard koristi isti API kao manager, ali sa dodatnim privilegijama
// Možemo koristiti manager route sa DIRECTOR role check
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !["DIRECTOR", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Koristimo istu logiku kao manager, ali sa dodatnim podacima
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
    },
    orderBy: { createdAt: "asc" },
  });

  // Prethodni period narudžbe
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

  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const prevTotalSales = prevOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalOrders = orders.length;
  const prevTotalOrders = prevOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;

  // Posjete
  const visits = await prisma.visit.findMany({
    where: {
      scheduledAt: { gte: from, lte: to },
      ...commercialFilter,
    },
    include: {
      commercial: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const visitsTotal = visits.length;
  const visitsPlanned = visits.filter((v) => v.status === "PLANNED").length;
  const visitsDone = visits.filter((v) => v.status === "DONE").length;
  const visitsCanceled = visits.filter((v) => v.status === "CANCELED").length;

  // Posjete sa narudžbama
  const visitsWithOrders = visits.filter((v) => {
    return orders.some((o) => o.commercialId === v.commercialId && 
      Math.abs(new Date(o.createdAt).getTime() - new Date(v.scheduledAt).getTime()) < 7 * 24 * 60 * 60 * 1000);
  }).length;

  const conversionRate = visitsDone > 0 ? (visitsWithOrders / visitsDone) * 100 : 0;

  // Prodaja po danima
  const salesByDayMap = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(key, (salesByDayMap.get(key) || 0) + Number(o.totalAmount));
  }
  const salesByDay = Array.from(salesByDayMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  // Posjete po danima
  const visitsByDayMap = new Map<string, { planned: number; done: number }>();
  for (const v of visits) {
    const key = v.scheduledAt.toISOString().slice(0, 10);
    const existing = visitsByDayMap.get(key) || { planned: 0, done: 0 };
    if (v.status === "PLANNED") existing.planned++;
    if (v.status === "DONE") existing.done++;
    visitsByDayMap.set(key, existing);
  }
  const visitsByDay = Array.from(visitsByDayMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  // Prodaja po danima u sedmici
  const salesByWeekdayMap = new Map<number, { amount: number; orders: number; visits: number }>();
  for (const o of orders) {
    const day = o.createdAt.getDay();
    const existing = salesByWeekdayMap.get(day) || { amount: 0, orders: 0, visits: 0 };
    existing.amount += Number(o.totalAmount);
    existing.orders++;
    salesByWeekdayMap.set(day, existing);
  }
  for (const v of visits) {
    const day = v.scheduledAt.getDay();
    const existing = salesByWeekdayMap.get(day) || { amount: 0, orders: 0, visits: 0 };
    existing.visits++;
    salesByWeekdayMap.set(day, existing);
  }
  const salesByWeekdayArray = Array.from(salesByWeekdayMap.entries())
    .map(([day, data]) => ({ day, ...data }))
    .sort((a, b) => a.day - b.day);

  // Prodaja po satima
  const salesByHourMap = new Map<number, { amount: number; orders: number }>();
  for (const o of orders) {
    const hour = o.createdAt.getHours();
    const existing = salesByHourMap.get(hour) || { amount: 0, orders: 0 };
    existing.amount += Number(o.totalAmount);
    existing.orders++;
    salesByHourMap.set(hour, existing);
  }
  const salesByHourArray = Array.from(salesByHourMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour - b.hour);

  // Prodaja po brendu
  const salesByBrandMap = new Map<string, { amount: number; orders: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const brandName = item.product.brand?.name || "Bez brenda";
      const existing = salesByBrandMap.get(brandName) || { amount: 0, orders: 0 };
      existing.amount += Number(item.lineTotal);
      if (!salesByBrandMap.has(brandName)) {
        existing.orders++;
      }
      salesByBrandMap.set(brandName, existing);
    }
  }
  const salesByBrand = Array.from(salesByBrandMap.entries())
    .map(([brand, data]) => ({ brand, ...data }))
    .sort((a, b) => b.amount - a.amount);

  // Top proizvodi
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    brand: string;
    quantity: number;
    amount: number;
    orders: Set<string>;
  }>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.productId;
      const existing = productMap.get(key) || {
        productId: item.productId,
        productName: item.product.name,
        brand: item.product.brand?.name || "Bez brenda",
        quantity: 0,
        amount: 0,
        orders: new Set<string>(),
      };
      existing.quantity += item.quantity;
      existing.amount += Number(item.lineTotal);
      existing.orders.add(o.id);
      productMap.set(key, existing);
    }
  }
  const topProducts = Array.from(productMap.values())
    .map((p) => ({ ...p, orders: p.orders.size }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  // Prodaja po komercijalisti
  const salesByCommercialMap = new Map<string, {
    commercialId: string;
    commercial: string;
    amount: number;
    ordersCount: number;
    visitsCount: number;
    visitsDone: number;
    visitsWithOrders: number;
    avgDaysToOrder: number;
    orderDates: Date[];
    visitDates: Date[];
  }>();
  for (const o of orders) {
    const key = o.commercialId;
    const existing = salesByCommercialMap.get(key) || {
      commercialId: o.commercialId,
      commercial: o.commercial.name,
      amount: 0,
      ordersCount: 0,
      visitsCount: 0,
      visitsDone: 0,
      visitsWithOrders: 0,
      avgDaysToOrder: 0,
      orderDates: [],
      visitDates: [],
    };
    existing.amount += Number(o.totalAmount);
    existing.ordersCount++;
    existing.orderDates.push(o.createdAt);
    salesByCommercialMap.set(key, existing);
  }
  for (const v of visits) {
    const key = v.commercialId;
    const existing = salesByCommercialMap.get(key) || {
      commercialId: v.commercialId,
      commercial: v.commercial.name,
      amount: 0,
      ordersCount: 0,
      visitsCount: 0,
      visitsDone: 0,
      visitsWithOrders: 0,
      avgDaysToOrder: 0,
      orderDates: [],
      visitDates: [],
    };
    existing.visitsCount++;
    if (v.status === "DONE") existing.visitsDone++;
    existing.visitDates.push(v.scheduledAt);
    salesByCommercialMap.set(key, existing);
  }
  // Izračunaj visitsWithOrders i avgDaysToOrder
  for (const [key, data] of salesByCommercialMap.entries()) {
    let visitsWithOrdersCount = 0;
    let totalDaysToOrder = 0;
    let daysToOrderCount = 0;
    for (const visitDate of data.visitDates) {
      const matchingOrder = data.orderDates.find((orderDate) => {
        const diff = Math.abs(orderDate.getTime() - visitDate.getTime());
        return diff < 7 * 24 * 60 * 60 * 1000 && orderDate >= visitDate;
      });
      if (matchingOrder) {
        visitsWithOrdersCount++;
        const days = Math.floor((matchingOrder.getTime() - visitDate.getTime()) / (24 * 60 * 60 * 1000));
        totalDaysToOrder += days;
        daysToOrderCount++;
      }
    }
    data.visitsWithOrders = visitsWithOrdersCount;
    data.avgDaysToOrder = daysToOrderCount > 0 ? totalDaysToOrder / daysToOrderCount : 0;
  }
  const salesByCommercial = Array.from(salesByCommercialMap.values())
    .map((c) => ({
      ...c,
      avgOrderValue: c.ordersCount > 0 ? c.amount / c.ordersCount : 0,
      avgDaysToOrder: c.avgDaysToOrder,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Performance ranking
  const performanceRanking = salesByCommercial.map((com) => {
    const conversionRate = com.visitsDone > 0 ? (com.visitsWithOrders / com.visitsDone) * 100 : 0;
    const visitCompletionRate = com.visitsCount > 0 ? (com.visitsDone / com.visitsCount) * 100 : 0;
    const score = com.amount * 0.4 + com.ordersCount * 10 + conversionRate * 5 + visitCompletionRate * 2;
    return {
      ...com,
      conversionRate,
      visitCompletionRate,
      score,
    };
  })
    .sort((a, b) => b.score - a.score)
    .map((com, idx) => ({ ...com, rank: idx + 1 }));

  // Top klijenti
  const clientMap = new Map<string, { clientId: string; client: string; amount: number; ordersCount: number }>();
  for (const o of orders) {
    const key = o.clientId;
    const existing = clientMap.get(key) || {
      clientId: o.clientId,
      client: o.client.name,
      amount: 0,
      ordersCount: 0,
    };
    existing.amount += Number(o.totalAmount);
    existing.ordersCount++;
    clientMap.set(key, existing);
  }
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

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
      newClientsCount++;
      newClientsSales += Number(order.totalAmount);
    } else {
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

  // 3. Churn analiza (klijenti bez narudžbi u posljednjih 3 mjeseca)
  // PRIKAZUJE SAMO KLIJENTE KOJI SU IMALI BAREM JEDNU NARUDŽBU
  const churnThreshold = new Date(year, month - 1 - 3, 1);
  
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
  
  churnedClients.sort((a, b) => b.monthsSinceLastOrder - a.monthsSinceLastOrder);
  const topChurnedClients = churnedClients.slice(0, 50);

  // 4. Razlog otkazivanja posjeta
  const cancellationReasons: Array<{ reason: string; count: number }> = [];
  const cancellationReasonMap = new Map<string, number>();
  
  for (const visit of visits) {
    if (visit.status === "CANCELED" && visit.note) {
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
  
  // Uzmi sve brancheve koji su ikad posjećeni
  const allVisitsWithBranches = await prisma.visit.findMany({
    where: {
      status: "DONE",
      ...commercialFilter,
    },
    include: {
      branches: {
        include: {
          branch: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      commercial: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });
  
  // Pronađi posljednju posjetu po branchu
  const lastVisitByBranch = new Map<string, {
    branchId: string;
    branchName: string;
    clientId: string;
    clientName: string;
    lastVisitDate: Date;
    commercialId: string;
    commercialName: string;
  }>();
  
  for (const visit of allVisitsWithBranches) {
    for (const visitBranch of visit.branches) {
      const branchId = visitBranch.branchId;
      if (!lastVisitByBranch.has(branchId)) {
        lastVisitByBranch.set(branchId, {
          branchId: branchId,
          branchName: visitBranch.branch.name,
          clientId: visitBranch.branch.clientId,
          clientName: visitBranch.branch.client.name,
          lastVisitDate: visit.scheduledAt,
          commercialId: visit.commercialId,
          commercialName: visit.commercial.name,
        });
      } else {
        const existing = lastVisitByBranch.get(branchId)!;
        if (visit.scheduledAt > existing.lastVisitDate) {
          existing.lastVisitDate = visit.scheduledAt;
          existing.commercialId = visit.commercialId;
          existing.commercialName = visit.commercial.name;
        }
      }
    }
  }
  
  // Uzmi sve brancheve koji su ikad bili u sistemu
  const allBranches = await prisma.clientBranch.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  const unvisitedBranches: Array<{
    branchId: string;
    branchName: string;
    clientId: string;
    clientName: string;
    lastVisitDate: Date | null;
    monthsSinceLastVisit: number;
    commercialId: string | null;
    commercialName: string | null;
  }> = [];
  
  const nowBranches = new Date();
  
  for (const branch of allBranches) {
    const lastVisitInfo = lastVisitByBranch.get(branch.id);
    const lastVisitDate = lastVisitInfo?.lastVisitDate || null;
    
    // Branch nije posjećen ili nije posjećen 3+ mjeseca
    if (!lastVisitDate || lastVisitDate < threeMonthsAgo) {
      const monthsSince = lastVisitDate
        ? Math.floor((nowBranches.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 999;
      unvisitedBranches.push({
        branchId: branch.id,
        branchName: branch.name,
        clientId: branch.clientId,
        clientName: branch.client.name,
        lastVisitDate: lastVisitDate,
        monthsSinceLastVisit: monthsSince,
        commercialId: lastVisitInfo?.commercialId || null,
        commercialName: lastVisitInfo?.commercialName || null,
      });
    }
  }
  
  // Sortiraj po mjesecima bez posjete (najduže prvo) i uzmi top 100
  unvisitedBranches.sort((a, b) => b.monthsSinceLastVisit - a.monthsSinceLastVisit);
  const topUnvisitedBranches = unvisitedBranches.slice(0, 100);

  // ========== ANALITIKE SREDNJEG PRIORITETA ==========
  
  // 6. Customer Lifetime Value (CLV)
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
  
  const clvMap = new Map<string, {
    clientId: string;
    client: string;
    orders: number;
    sales: number;
    firstOrder: Date;
    lastOrder: Date;
  }>();
  
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
  
  const clientLifetimeValue: Array<{
    clientId: string;
    client: string;
    totalOrders: number;
    totalSales: number;
    firstOrderDate: Date;
    lastOrderDate: Date;
    avgOrderValue: number;
  }> = [];
  
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
  
  for (const order of prevOrders) {
    for (const item of order.items) {
      const key = item.productId;
      prevProductSales.set(key, (prevProductSales.get(key) || 0) + Number(item.lineTotal));
    }
  }
  
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

  // 8. Aktivnost komercijalista (heatmap)
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

  // 10. Funnel analiza
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

  // Realizacija planova
  const plans = await prisma.plan.findMany({
    where: {
      year,
      month,
    },
    include: {
      assignments: {
        include: {
          commercial: true,
        },
      },
    },
  });

  const achievementByCommercial = new Map<string, {
    commercialId: string;
    commercial: string;
    target: number;
    achieved: number;
    percentage: number;
    planId: string;
  }>();

  for (const plan of plans) {
    for (const assignment of plan.assignments) {
      const key = assignment.commercialId;
      const commercialOrders = orders.filter((o) => o.commercialId === assignment.commercialId);
      const achieved = commercialOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const target = Number(assignment.target);
      const percentage = target > 0 ? (achieved / target) * 100 : 0;

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
      target: 0,
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
      target: 50,
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

