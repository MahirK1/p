import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json().catch(() => ({}));
  const roomId = body.roomId as string | undefined;

  if (!roomId) {
    return NextResponse.json({ error: "roomId je obavezan" }, { status: 400 });
  }

  const member = await prisma.chatRoomMember.findFirst({
    where: { roomId, userId },
  });
  if (!member) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    select: { id: true, readBy: true },
  });

  for (const msg of messages) {
    const readBy = msg.readBy as string[] | null;
    const arr = Array.isArray(readBy) ? readBy : [];
    if (!arr.includes(userId)) {
      await prisma.chatMessage.update({
        where: { id: msg.id },
        data: { readBy: [...arr, userId] as any },
      });
    }
  }

  return NextResponse.json({ success: true });
}
