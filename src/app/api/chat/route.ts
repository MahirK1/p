import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const userId = (session.user as any).id as string;

  const rooms = await prisma.chatRoom.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(rooms);
}