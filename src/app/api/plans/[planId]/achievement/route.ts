import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { planId } = await context.params;

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { brand: true, assignments: { include: { commercial: true } } },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan ne postoji" }, { status: 404 });
  }

  const from = new Date(plan.year, plan.month - 1, 1);
  const to = new Date(plan.year, plan.month, 0, 23, 59, 59);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ["APPROVED", "COMPLETED"] },
      ...(plan.brandId
        ? {
            items: {
              some: {
                product: { brandId: plan.brandId },
              },
            },
          }
        : {}),
    },
    include: {
      items: {
        include: {
          product: { include: { brand: true } },
        },
      },
      commercial: true,
    },
  });

  let totalAchieved = 0;
  const byCommercial = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      if (plan.brandId && item.product.brandId !== plan.brandId) continue;
      const amount = Number(item.lineTotal);
      totalAchieved += amount;
      const key = order.commercialId;
      byCommercial.set(key, (byCommercial.get(key) ?? 0) + amount);
    }
  }

  const planTarget = plan.totalTarget != null ? Number(plan.totalTarget) : 0;
  const achievementPercentage =
    planTarget > 0 ? (totalAchieved / planTarget) * 100 : 0;

  const assignmentsWithProgress = plan.assignments.map((a) => ({
    ...a,
    achieved: byCommercial.get(a.commercialId) ?? 0,
    percentage:
      ((byCommercial.get(a.commercialId) ?? 0) / Number(a.target)) * 100,
  }));

  return NextResponse.json({
    plan,
    totalAchieved,
    achievementPercentage,
    assignmentsWithProgress,
  });
}