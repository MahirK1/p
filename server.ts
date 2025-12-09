import { createServer } from "http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { prisma } from "./src/lib/prisma";
import { sendPushNotificationToMultipleUsers } from "./src/lib/push-notifications";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  const server = createServer((req, res) => handle(req, res));

  const io = new IOServer(server, {
    cors: { origin: process.env.NEXT_PUBLIC_CLIENT_ORIGIN ?? "*" },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`🔌 User ${userId} connected to socket`);

    socket.join(userId);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      console.log(`📍 User ${userId} joined room ${roomId}`);
    });

    socket.on(
      "send-message",
      async (payload: { roomId: string; content: string }) => {
        if (!payload.roomId || !payload.content.trim()) return;

        console.log(`💬 User ${userId} sending message to room ${payload.roomId}`);

        try {
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
          console.log(`📡 Message broadcasted to room ${payload.roomId}`);

          // Pošalji push notifikacije SVIM primateljima (uključujući online)
          // Push notifikacije su korisne i kada je korisnik online ali na drugom tabu ili nije fokusiran
          const recipientIds = msg.room.members
            .map((member) => member.userId)
            .filter((id) => id !== userId);

          console.log(`📬 Preparing push notifications for ${recipientIds.length} recipients:`, recipientIds);

          if (recipientIds.length > 0) {
            const roomName = msg.room.name || msg.author.name || "Nova poruka";
            const messagePreview = msg.content.substring(0, 100);
            
            const result = await sendPushNotificationToMultipleUsers(
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
            );
            
            console.log(`📊 Push notification results: ${result.successful}/${result.total} successful, ${result.failed} failed`);
            
            if (result.failed > 0) {
              console.error(`⚠️ Failed to send ${result.failed} push notifications`);
            }
          } else {
            console.log("⚠️ No recipients for push notifications");
          }
        } catch (error: any) {
          console.error("❌ Error processing message:", error);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔌 User ${userId} disconnected`);
    });
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`🚀 Server ready on http://localhost:${port}`);
    console.log(`📱 Socket.IO listening on /api/socket.io`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});