import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId je obavezan" }, { status: 400 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}