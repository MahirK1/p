import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/plans/achievement?year=&month=
 * Manager/Admin: vraća ispunjenje planova po komercijalisti za zadani mjesec/godinu.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  if (!["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);

  const plans = await prisma.plan.findMany({
    where: { year, month },
    include: {
      brand: true,
      commercial: { select: { id: true, name: true, email: true } },
      productTargets: { include: { product: true } },
      assignments: { include: { commercial: { select: { id: true, name: true } } } },
    },
    orderBy: [{ commercialId: "asc" }, { createdAt: "desc" }],
  });

  const commercialIds = new Set<string>();
  for (const p of plans) {
    if (p.commercialId) commercialIds.add(p.commercialId);
    for (const a of p.assignments) commercialIds.add(a.commercialId);
  }

  const orders = await prisma.order.findMany({
    where: {
      commercialId: { in: Array.from(commercialIds) },
      createdAt: { gte: from, lte: to },
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    include: {
      items: { include: { product: true } },
      commercial: { select: { id: true, name: true } },
    },
  });

  // Ista logika kao na commercial page: po komercijalisti imamo totalAmount,
  // salesByBrand (KM po brandu) i byProduct (količina u komadima po proizvodu).
  const salesByCommercial = new Map<
    string,
    { totalAmount: number; byProduct: Map<string, number>; byBrand: Map<string | null, number> }
  >();
  for (const order of orders) {
    const cid = order.commercialId;
    let rec = salesByCommercial.get(cid);
    if (!rec) {
      rec = { totalAmount: 0, byProduct: new Map(), byBrand: new Map() };
      salesByCommercial.set(cid, rec);
    }
    rec.totalAmount += Number(order.totalAmount);
    for (const item of order.items) {
      const q = rec.byProduct.get(item.productId) ?? 0;
      rec.byProduct.set(item.productId, q + item.quantity);
      const brandId = item.product.brandId ?? null;
      rec.byBrand.set(brandId, (rec.byBrand.get(brandId) ?? 0) + Number(item.lineTotal));
    }
  }

  type PlanAchievement = {
    planId: string;
    brandName: string | null;
    totalTarget: number | null;
    totalAchieved: number;
    totalPercentage: number;
    productTargets: {
      productId: string;
      productName: string;
      quantityTarget: number;
      quantityAchieved: number;
      percentage: number;
    }[];
  };

  const byCommercial: {
    commercialId: string;
    commercialName: string;
    plans: PlanAchievement[];
    totalTarget: number;
    totalAchieved: number;
    overallPercentage: number;
  }[] = [];

  const processedCommercials = new Set<string>();

  for (const plan of plans) {
    const commercialId = plan.commercialId;
    const assignmentList = plan.assignments;

    if (commercialId) {
      const commercial = plan.commercial!;
      const sales = salesByCommercial.get(commercialId);
      const byProduct = sales?.byProduct ?? new Map();
      const byBrand = sales?.byBrand ?? new Map();
      // Ista logika kao commercial page: plan s brandId = iznos (KM) za taj brand; inače ukupna prodaja
      const planAchievedKm = plan.brandId
        ? (byBrand.get(plan.brandId) ?? 0)
        : (sales?.totalAmount ?? 0);

      const productTargetsAchievement = (plan.productTargets || []).map((pt) => {
        const achieved = byProduct.get(pt.productId) ?? 0;
        const target = pt.quantityTarget;
        const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
        return {
          productId: pt.productId,
          productName: pt.product.name,
          quantityTarget: target,
          quantityAchieved: achieved,
          percentage: pct,
        };
      });

      const totalTargetKm = plan.totalTarget != null ? Number(plan.totalTarget) : null;
      const totalPercentage =
        totalTargetKm != null && totalTargetKm > 0
          ? (planAchievedKm / totalTargetKm) * 100
          : productTargetsAchievement.length > 0
            ? productTargetsAchievement.reduce((s, p) => s + p.percentage, 0) / productTargetsAchievement.length
            : 0;

      let entry = byCommercial.find((c) => c.commercialId === commercialId);
      if (!entry) {
        entry = {
          commercialId,
          commercialName: commercial.name,
          plans: [],
          totalTarget: 0,
          totalAchieved: 0,
          overallPercentage: 0,
        };
        byCommercial.push(entry);
        processedCommercials.add(commercialId);
      }

      entry.plans.push({
        planId: plan.id,
        brandName: plan.brand?.name ?? null,
        totalTarget: totalTargetKm,
        totalAchieved: planAchievedKm,
        totalPercentage,
        productTargets: productTargetsAchievement,
      });
      if (totalTargetKm != null) entry.totalTarget += totalTargetKm;
      entry.totalAchieved += planAchievedKm;
    }

    for (const a of assignmentList) {
      const sales = salesByCommercial.get(a.commercialId);
      const achieved = sales?.totalAmount ?? 0;
      const target = Number(a.target);
      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      let entry = byCommercial.find((c) => c.commercialId === a.commercialId);
      if (!entry) {
        entry = {
          commercialId: a.commercialId,
          commercialName: a.commercial.name,
          plans: [],
          totalTarget: 0,
          totalAchieved: 0,
          overallPercentage: 0,
        };
        byCommercial.push(entry);
        processedCommercials.add(a.commercialId);
      }

      entry.plans.push({
        planId: plan.id,
        brandName: plan.brand?.name ?? null,
        totalTarget: target,
        totalAchieved: achieved,
        totalPercentage: percentage,
        productTargets: [],
      });
      entry.totalTarget += target;
      entry.totalAchieved += achieved;
    }
  }

  for (const entry of byCommercial) {
    entry.overallPercentage =
      entry.totalTarget > 0 ? (entry.totalAchieved / entry.totalTarget) * 100 : 0;
  }

  return NextResponse.json({
    year,
    month,
    byCommercial,
  });
}
