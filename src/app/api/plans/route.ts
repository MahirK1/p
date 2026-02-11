import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const commercialId = searchParams.get("commercialId");

  const includePlan = {
    brand: true,
    productTargets: { include: { product: true } },
    commercial: { select: { id: true, name: true, email: true } },
  };

  // Komercijalista vidi samo svoje planove za trenutni mjesec/godinu
  if (user.role === "COMMERCIAL" || commercialId === "me") {
    const currentYear = Number(year) || new Date().getFullYear();
    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const uid = user.id;

    const plans = await prisma.plan.findMany({
      where: {
        year: currentYear,
        month: currentMonth,
        OR: [
          { commercialId: uid },
          { assignments: { some: { commercialId: uid } } },
        ],
      },
      include: includePlan,
      orderBy: [{ createdAt: "desc" }],
    });

    plans.sort((a, b) => {
      if (a.brandId === null && b.brandId !== null) return -1;
      if (a.brandId !== null && b.brandId === null) return 1;
      return 0;
    });

    return NextResponse.json(plans);
  }

  // Manager/Admin vidi sve planove
  const plans = await prisma.plan.findMany({
    where: {
      ...(year ? { year: Number(year) } : {}),
      ...(month ? { month: Number(month) } : {}),
    },
    include: includePlan,
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });

  plans.sort((a, b) => {
    if (a.brandId === null && b.brandId !== null) return -1;
    if (a.brandId !== null && b.brandId === null) return 1;
    return 0;
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = session.user as any;

  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { brandId, month, year, totalTarget, commercialId, productTargets } = body;

  if (!month || !year) {
    return NextResponse.json(
      { error: "Mjesec i godina su obavezni." },
      { status: 400 }
    );
  }

  // Novi način: plan po komercijalisti (commercialId obavezan), s opcionalnim targetima po proizvodu.
  // Dozvoljeno je više planova za istog komercijalistu u istom mjesecu.
  if (commercialId) {
    const plan = await prisma.plan.create({
      data: {
        brandId: brandId || null,
        commercialId,
        month: Number(month),
        year: Number(year),
        totalTarget: totalTarget != null && totalTarget !== "" ? Number(totalTarget) : null,
        createdById: user.id,
      },
      include: {
        brand: true,
        commercial: { select: { id: true, name: true, email: true } },
        productTargets: { include: { product: true } },
      },
    });

    const targets = Array.isArray(productTargets) ? productTargets : [];
    for (const t of targets) {
      if (t?.productId && (t?.quantity ?? t?.quantityTarget) > 0) {
        await prisma.planProductTarget.create({
          data: {
            planId: plan.id,
            productId: t.productId,
            quantityTarget: Number(t.quantity ?? t.quantityTarget),
          },
        });
      }
    }

    const planWithTargets = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        brand: true,
        commercial: { select: { id: true, name: true, email: true } },
        productTargets: { include: { product: true } },
      },
    });

    await logAudit(req, user, {
      action: "CREATE_PLAN",
      entityType: "Plan",
      entityId: plan.id,
      metadata: {
        commercialId: plan.commercialId,
        brandId: plan.brandId,
        month: plan.month,
        year: plan.year,
        totalTarget: plan.totalTarget,
        productTargetsCount: targets.length,
      },
    });

    return NextResponse.json(planWithTargets, { status: 201 });
  }

  // Stari način: globalni plan (bez commercialId) – zahtijeva totalTarget
  if (totalTarget == null || totalTarget === "") {
    return NextResponse.json(
      { error: "Ukupni target (KM) ili commercialId s productTargets su obavezni." },
      { status: 400 }
    );
  }

  const existing = await prisma.plan.findFirst({
    where: {
      brandId: brandId || null,
      commercialId: null,
      month: Number(month),
      year: Number(year),
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Plan za ${brandId ? "ovaj brand" : "globalno"} već postoji za ${month}.${year}.` },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.create({
    data: {
      brandId: brandId || null,
      month: Number(month),
      year: Number(year),
      totalTarget: Number(totalTarget),
      createdById: user.id,
    },
    include: {
      brand: true,
      productTargets: { include: { product: true } },
    },
  });

  await logAudit(req, user, {
    action: "CREATE_PLAN",
    entityType: "Plan",
    entityId: plan.id,
    metadata: {
      brandId: plan.brandId,
      month: plan.month,
      year: plan.year,
      totalTarget: plan.totalTarget,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = session.user as any;

  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID plana je obavezan." },
      { status: 400 }
    );
  }

  // Provjeri da li plan postoji
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      assignments: true,
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Plan ne postoji." },
      { status: 404 }
    );
  }

  // Obriši plan (assignments će biti obrisani automatski zbog cascade ili ručno)
  // Prvo obriši assignments
  await prisma.planAssignment.deleteMany({
    where: { planId: id },
  });

  // Zatim obriši plan
  await prisma.plan.delete({
    where: { id },
  });

  await logAudit(req, user, {
    action: "DELETE_PLAN",
    entityType: "Plan",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}