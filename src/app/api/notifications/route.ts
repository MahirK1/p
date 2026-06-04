import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "30"), 100);
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const skip = (page - 1) * limit;
  const unreadOnly = searchParams.get("unreadOnly") === "1";

  const where = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, unreadCount, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { id, markAllRead } = body as { id?: string; markAllRead?: boolean };

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "id je obavezan." }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
