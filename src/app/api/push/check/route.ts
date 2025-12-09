import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  try {
    // Provjeri subscription za trenutnog korisnika
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Provjeri sve subscriptions u bazi
    const allSubscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasSubscription: !!subscription,
        subscription: subscription
          ? {
              endpoint: subscription.endpoint.substring(0, 50) + "...",
              createdAt: subscription.createdAt,
              updatedAt: subscription.updatedAt,
            }
          : null,
      },
      allSubscriptions: allSubscriptions.map((sub) => ({
        userId: sub.userId,
        userEmail: sub.user.email,
        userName: sub.user.name,
        endpoint: sub.endpoint.substring(0, 50) + "...",
        createdAt: sub.createdAt,
      })),
      totalSubscriptions: allSubscriptions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
