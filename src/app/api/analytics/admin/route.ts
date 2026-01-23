import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Broj korisnika po rolama
  const usersCount = await prisma.user.count();
  const commercialCount = await prisma.user.count({
    where: { role: "COMMERCIAL" },
  });
  const managerCount = await prisma.user.count({
    where: { role: "MANAGER" },
  });
  const orderManagerCount = await prisma.user.count({
    where: { role: "ORDER_MANAGER" },
  });
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  // Broj proizvoda
  const productsCount = await prisma.product.count();
  const productsLowStock = await prisma.product.count({
    where: { stock: { lte: 10 } },
  });
  const productsOutOfStock = await prisma.product.count({
    where: { stock: { lte: 0 } },
  });

  // Broj klijenata
  const clientsCount = await prisma.client.count();
  const clientsWithBranches = await prisma.client.count({
    where: {
      branches: {
        some: {},
      },
    },
  });

  // Broj brandova
  const brandsCount = await prisma.brand.count();

  // Broj narudžbi
  const ordersCount = await prisma.order.count();
  const ordersPending = await prisma.order.count({
    where: { status: "PENDING" },
  });
  const ordersApproved = await prisma.order.count({
    where: { status: "APPROVED" },
  });
  const ordersCompleted = await prisma.order.count({
    where: { status: "COMPLETED" },
  });
  const ordersCanceled = await prisma.order.count({
    where: { status: "CANCELED" },
  });

  // Ukupna prodaja
  const totalSales = await prisma.order.aggregate({
    where: {
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Broj posjeta
  const visitsCount = await prisma.visit.count();
  const visitsPlanned = await prisma.visit.count({
    where: { status: "PLANNED" },
  });
  const visitsDone = await prisma.visit.count({
    where: { status: "DONE" },
  });
  const visitsCanceled = await prisma.visit.count({
    where: { status: "CANCELED" },
  });

  // Poslednje aktivnosti (narudžbe i korisnici)
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      commercial: {
        select: { name: true },
      },
      client: {
        select: { name: true },
      },
    },
  });

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // Statistike za ovaj mjesec
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

  const monthlyOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  const monthlySales = await prisma.order.aggregate({
    where: {
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    _sum: {
      totalAmount: true,
    },
  });

  const monthlyVisits = await prisma.visit.count({
    where: {
      scheduledAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  return NextResponse.json({
    // Korisnici
    users: {
      total: usersCount,
      byRole: {
        commercial: commercialCount,
        manager: managerCount,
        orderManager: orderManagerCount,
        admin: adminCount,
      },
      recent: recentUsers,
    },
    // Proizvodi
    products: {
      total: productsCount,
      lowStock: productsLowStock,
      outOfStock: productsOutOfStock,
    },
    // Klijenti
    clients: {
      total: clientsCount,
      withBranches: clientsWithBranches,
    },
    // Brandovi
    brands: {
      total: brandsCount,
    },
    // Narudžbe
    orders: {
      total: ordersCount,
      byStatus: {
        pending: ordersPending,
        approved: ordersApproved,
        completed: ordersCompleted,
        canceled: ordersCanceled,
      },
      recent: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        commercial: o.commercial.name,
        client: o.client.name,
        createdAt: o.createdAt,
      })),
    },
    // Prodaja
    sales: {
      total: Number(totalSales._sum.totalAmount || 0),
      monthly: Number(monthlySales._sum.totalAmount || 0),
    },
    // Posjete
    visits: {
      total: visitsCount,
      planned: visitsPlanned,
      done: visitsDone,
      canceled: visitsCanceled,
      monthly: monthlyVisits,
    },
    // Aktivnosti ovaj mjesec
    monthly: {
      orders: monthlyOrders,
      sales: Number(monthlySales._sum.totalAmount || 0),
      visits: monthlyVisits,
    },
  });
}
