import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  const userId = user.id as string;
  const role = user.role as "COMMERCIAL" | "MANAGER" | "ORDER_MANAGER" | "ADMIN";

  // 1) GLOBALNA GRUPNA SOBA – svi komercijalisti + manageri
  let globalRoom = await prisma.chatRoom.findFirst({
    where: { type: "GROUP", name: "Italgroup chat" },
    include: { members: true },
  });

  if (!globalRoom) {
    // kreiraj sobu
    globalRoom = await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        name: "Italgroup chat",
      },
      include: { members: true },
    });

    // dodaj sve komercijaliste i managere kao članove
    const users = await prisma.user.findMany({
      where: { role: { in: ["COMMERCIAL", "MANAGER"] } },
      select: { id: true },
    });

    await prisma.chatRoomMember.createMany({
      data: users.map((u) => ({ roomId: globalRoom!.id, userId: u.id })),
      skipDuplicates: true,
    });

    globalRoom = await prisma.chatRoom.findUnique({
      where: { id: globalRoom.id },
      include: { members: true },
    });
  } else {
    // osiguraj da trenutni user bude član ako je COMMERCIAL ili MANAGER
    if (["COMMERCIAL", "MANAGER"].includes(role)) {
      const exists = globalRoom.members.some((m) => m.userId === userId);
      if (!exists) {
        await prisma.chatRoomMember.create({
          data: { roomId: globalRoom.id, userId },
        });
        globalRoom = await prisma.chatRoom.findUnique({
          where: { id: globalRoom.id },
          include: { members: true },
        });
      }
    }
  }

  // 2) SOBA "MOJI MANAGERI" – za komercijalistu: on + svi manageri
  let myManagersRoom = null;
  if (role === "COMMERCIAL") {
    myManagersRoom = await prisma.chatRoom.findFirst({
      where: {
        type: "GROUP",
        name: `Mirela · ${user.name}`,
      },
      include: { members: true },
    });

    if (!myManagersRoom) {
      myManagersRoom = await prisma.chatRoom.create({
        data: {
          type: "GROUP",
          name: `Mirela · ${user.name}`,
        },
        include: { members: true },
      });

      const managers = await prisma.user.findMany({
        where: { role: "MANAGER" },
        select: { id: true },
      });

      await prisma.chatRoomMember.createMany({
        data: [
          { roomId: myManagersRoom.id, userId }, // komercijalista
          ...managers.map((m) => ({
            roomId: myManagersRoom!.id,
            userId: m.id,
          })),
        ],
        skipDuplicates: true,
      });

      myManagersRoom = await prisma.chatRoom.findUnique({
        where: { id: myManagersRoom.id },
        include: { members: true },
      });
    } else {
      // osiguraj da je user član
      const exists = myManagersRoom.members.some((m) => m.userId === userId);
      if (!exists) {
        await prisma.chatRoomMember.create({
          data: { roomId: myManagersRoom.id, userId },
        });
        myManagersRoom = await prisma.chatRoom.findUnique({
          where: { id: myManagersRoom.id },
          include: { members: true },
        });
      }
    }
  }

  // 3) Ostale sobe u kojima je user član (npr. druge grupne/direktne)
  const otherRooms = await prisma.chatRoom.findMany({
    where: {
      members: { some: { userId } },
      // izuzmi global i myManagersRoom da ih ne duplamo
      NOT: {
        id: {
          in: [
            globalRoom?.id ?? "0",
            myManagersRoom?.id ?? "0",
          ],
        },
      },
    },
    include: { members: true },
    orderBy: { updatedAt: "desc" },
  });

  const allRooms = [
    globalRoom!,
    ...(myManagersRoom ? [myManagersRoom] : []),
    ...otherRooms,
  ];

  // Na kraju, umjesto direktnog vraćanja, dodaj last message:

  const roomsWithLastMessage = await Promise.all(
    allRooms.map(async (room) => {
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { roomId: room.id },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      // Za DIRECT room-ove bez imena, generiši ime iz članova
      let displayName = room.name;
      if (!displayName && room.type === "DIRECT") {
        const otherMember = room.members.find((m) => m.userId !== userId);
        if (otherMember) {
          // Učitaj podatke o korisniku
          const otherUser = await prisma.user.findUnique({
            where: { id: otherMember.userId },
            select: { name: true },
          });
          displayName = otherUser?.name ?? "Korisnik";
        } else {
          displayName = "1-na-1";
        }
      }

      return {
        ...room,
        name: displayName,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
              author: { name: lastMessage.author.name },
            }
          : null,
      };
    })
  );

  return NextResponse.json(roomsWithLastMessage);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  const userId = user.id as string;
  const role = user.role as "COMMERCIAL" | "MANAGER" | "ORDER_MANAGER" | "ADMIN";

  // Samo manager može kreirati DIRECT room sa komercijalistom
  if (role !== "MANAGER") {
    return new NextResponse("Only managers can create rooms", { status: 403 });
  }

  try {
    const { commercialId } = await req.json();
    
    if (!commercialId) {
      return new NextResponse("commercialId is required", { status: 400 });
    }

    // Provjeri da li komercijalista postoji i da je COMMERCIAL
    const commercial = await prisma.user.findUnique({
      where: { id: commercialId },
    });

    if (!commercial || commercial.role !== "COMMERCIAL") {
      return new NextResponse("Commercial user not found", { status: 404 });
    }

    // Provjeri da li već postoji DIRECT room između ovog managera i komercijaliste
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        type: "DIRECT",
        members: {
          every: {
            userId: { in: [userId, commercialId] },
          },
        },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: commercialId } } },
        ],
      },
      include: { members: true },
    });

    // Ako postoji room sa tačno 2 člana (manager + komercijalista), vrati ga
    if (existingRoom && existingRoom.members.length === 2) {
      return NextResponse.json(existingRoom);
    }

    // Kreiraj novi DIRECT room
    const newRoom = await prisma.chatRoom.create({
      data: {
        type: "DIRECT",
        name: null, // DIRECT room-ovi nemaju ime, prikazuje se ime drugog korisnika
      },
      include: { members: true },
    });

    // Dodaj managera i komercijalistu kao članove
    await prisma.chatRoomMember.createMany({
      data: [
        { roomId: newRoom.id, userId },
        { roomId: newRoom.id, userId: commercialId },
      ],
    });

    await logAudit(req, user, {
      action: "CREATE_CHAT_ROOM",
      entityType: "ChatRoom",
      entityId: newRoom.id,
      metadata: {
        type: "DIRECT",
        managerId: userId,
        commercialId,
      },
    });

    // Vrati room sa članovima
    const roomWithMembers = await prisma.chatRoom.findUnique({
      where: { id: newRoom.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(roomWithMembers);
  } catch (error) {
    console.error("Error creating room:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}