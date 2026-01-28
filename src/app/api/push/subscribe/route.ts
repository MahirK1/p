import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription, userId } = await req.json();

    if (!subscription || !userId) {
      return NextResponse.json(
        { error: "Subscription i userId su obavezni" },
        { status: 400 }
      );
    }

    // Save subscription to database
    await prisma.pushSubscription.upsert({
      where: {
        userId: userId,
      },
      update: {
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
        updatedAt: new Date(),
      },
      create: {
        userId: userId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
      },
    });

    await logAudit(req, session.user as any, {
      action: "UPSERT_PUSH_SUBSCRIPTION",
      entityType: "PushSubscription",
      entityId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Greška pri spremanju subscriptiona" },
      { status: 500 }
    );
  }
}
