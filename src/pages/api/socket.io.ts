import type { NextApiRequest } from "next";
import { Server as IOServer } from "socket.io";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToMultipleUsers } from "@/lib/push-notifications";

// Define NextApiResponseServerIO type inline to avoid import problems
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { Server as IOSocketServer } from "socket.io";
import type { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: HTTPServer & {
      io: IOSocketServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server as any, {
      path: "/api/socket.io",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      const userId = socket.handshake.auth.userId as string | undefined;
      if (!userId) {
        socket.disconnect();
        return;
      }

      socket.join(userId);

      socket.on("join-room", (roomId: string) => {
        socket.join(roomId);
      });

      socket.on(
        "send-message",
        async (payload: { roomId: string; content: string }) => {
          if (!payload.roomId || !payload.content.trim()) return;

          // Kreiraj poruku
          const msg = await prisma.chatMessage.create({
            data: {
              roomId: payload.roomId,
              authorId: userId,
              content: payload.content.trim(),
            },
            include: { 
              author: true,
              room: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Ažuriraj updatedAt na sobi
          await prisma.chatRoom.update({
            where: { id: payload.roomId },
            data: { updatedAt: new Date() },
          });

          // Emituj poruku svim članovima sobe preko socket-a
          io.to(payload.roomId).emit("new-message", msg);

          // Pošalji push notifikacije svim članovima sobe (osim pošiljatelju)
          const recipientIds = msg.room.members
            .map((member) => member.userId)
            .filter((id) => id !== userId);

          if (recipientIds.length > 0) {
            const roomName = msg.room.name || msg.author.name || "Nova poruka";
            const messagePreview = msg.content.substring(0, 100);
            
            // Pošalji notifikacije asinhrono (ne blokiraj response)
            sendPushNotificationToMultipleUsers(
              recipientIds,
              roomName,
              `${msg.author.name || "Korisnik"}: ${messagePreview}`,
              {
                tag: payload.roomId,
                url: `/dashboard/commercial/chat?room=${payload.roomId}`,
                data: {
                  roomId: payload.roomId,
                  messageId: msg.id,
                },
              }
            ).catch((err) => {
              console.error("Error sending push notifications:", err);
            });
          }
        }
      );
    });

    res.socket.server.io = io;
  }

  res.end();
}