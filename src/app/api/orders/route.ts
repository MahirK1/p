import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendOrderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const mine = searchParams.get("mine");
  const status = searchParams.get("status");
  const commercialId = searchParams.get("commercialId");
  const clientId = searchParams.get("clientId");

  // Ako se traži pojedinačna narudžba
  if (id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        commercial: true,
        items: { include: { product: true } },
      },
    });
    if (!order) return new NextResponse("Not found", { status: 404 });
    return NextResponse.json(order);
  }

  const where: any = {};
  if (mine && user) {
    where.commercialId = user.id;
  }
  if (status) where.status = status;
  if (commercialId) where.commercialId = commercialId;
  if (clientId) where.clientId = clientId;

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: true,
      commercial: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (!["COMMERCIAL", "ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const items = body.items as Array<{
    productId: string;
    quantity: number;
    discountPercent?: number;
    price?: number;
    isGratis?: boolean;
  }>;
  const clientId = body.clientId as string;
  const branchId = body.branchId as string | undefined;
  const note = body.note as string | undefined;

  if (!clientId || !items?.length) {
    return NextResponse.json(
      { error: "Klijent i stavke su obavezni." },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });

  let total = 0;
  const orderItemsData = items.map((item) => {
    const product = products.find((p: { id: string }) => p.id === item.productId);
    if (!product) throw new Error("Proizvod ne postoji");
    if (item.quantity <= 0) throw new Error("Količina mora biti > 0");

    // Ako je artikal gratis, cijena je 0
    const isGratis = item.isGratis || false;
    const unitPrice = isGratis ? 0 : (item.price ? Number(item.price) : Number(product.price ?? 0));
    const discountPercent = item.discountPercent ? Number(item.discountPercent) : 0;
    
    // Računanje sa rabatom (za gratis artikle je sve 0)
    const baseTotal = unitPrice * item.quantity;
    const discountAmount = (baseTotal * discountPercent) / 100;
    const lineTotal = baseTotal - discountAmount;
    
    total += lineTotal;

    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      discountPercent: discountPercent > 0 ? discountPercent : null,
      lineTotal,
    };
  });

  const orderNumber = `ORD-${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      clientId,
      commercialId: user.id,
      branchId: branchId || null,
      status: "PENDING",
      totalAmount: total,
      note: note || null,
      items: { create: orderItemsData },
    },
    include: {
      client: true,
      commercial: true,
      branch: true,
      items: { include: { product: true } },
    },
  });

  // Provjera zaliha (preskoči za gratis artikle)
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: "Proizvod ne postoji." }, { status: 400 });
    }
    // Ako artikal nije gratis, provjeri zalihu
    if (!item.isGratis) {
      const available = Number(product?.stock ?? 0);
      if (item.quantity > available) {
        return NextResponse.json(
          { error: `Nedovoljna zaliha za ${product.name} (na stanju ${available}).` },
          { status: 400 }
        );
      }
    }
  }

  // Decrement stock (preskoči za gratis artikle)
  for (const item of order.items) {
    const originalItem = items.find((i) => i.productId === item.productId);
    // Ne smanjuj zalihu za gratis artikle
    if (!originalItem?.isGratis) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }
  // Send email notifications (ne blokira ako email fail-uje)
  try {
    await sendOrderEmail(order);
  } catch (error: any) {
    // Loguj grešku ali ne prekidaj kreiranje narudžbe
    console.error("⚠️ Greška pri slanju emaila (narudžba je ipak kreirana):", error.message);
  }

  await logAudit(req, user, {
    action: "CREATE_ORDER",
    entityType: "Order",
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      clientId,
      branchId: branchId || null,
      totalAmount: order.totalAmount,
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
      })),
    },
  });

  return NextResponse.json(order, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (!["ORDER_MANAGER", "ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { orderId, status } = body;
  if (!orderId || !status) {
    return NextResponse.json(
      { error: "orderId i status su obavezni" },
      { status: 400 }
    );
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  await logAudit(req, user, {
    action: "UPDATE_ORDER_STATUS",
    entityType: "Order",
    entityId: order.id,
    metadata: {
      status: order.status,
    },
  });

  return NextResponse.json(order);
}