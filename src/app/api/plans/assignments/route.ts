import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { planId, commercialId, target } = body;

  if (!planId || !commercialId || target === undefined) {
    return NextResponse.json(
      { error: "planId, commercialId i target su obavezni." },
      { status: 400 }
    );
  }

  // Provjeri da li već postoji assignment
  const existing = await prisma.planAssignment.findFirst({
    where: {
      planId,
      commercialId,
    },
  });

  let assignment;
  if (existing) {
    assignment = await prisma.planAssignment.update({
      where: { id: existing.id },
      data: { target: Number(target) },
      include: {
        commercial: true,
        plan: { include: { brand: true } },
      },
    });
  } else {
    assignment = await prisma.planAssignment.create({
      data: {
        planId,
        commercialId,
        target: Number(target),
      },
      include: {
        commercial: true,
        plan: { include: { brand: true } },
      },
    });
  }

  await logAudit(req, user, {
    action: existing ? "UPDATE_PLAN_ASSIGNMENT" : "CREATE_PLAN_ASSIGNMENT",
    entityType: "PlanAssignment",
    entityId: assignment.id,
    metadata: {
      planId,
      commercialId,
      target: assignment.target,
    },
  });

  return NextResponse.json(assignment);
}