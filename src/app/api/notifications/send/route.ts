import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  notifyAllCommercials,
  notifyAllUsers,
  notifyUsers,
  notifyUsersByRole,
} from "@/lib/user-notifications";

const ADMIN_AUDIENCES = [
  "ALL",
  "COMMERCIAL",
  "MANAGER",
  "DIRECTOR",
  "ORDER_MANAGER",
  "ADMIN",
  "SELECTED",
] as const;

const MANAGER_AUDIENCES = ["ALL_COMMERCIALS", "SELECTED"] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { id?: string; role?: string; name?: string };
  if (!user.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { title, message, url, audience, userIds } = body as {
    title?: string;
    message?: string;
    url?: string;
    audience?: string;
    userIds?: string[];
  };

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Naslov i poruka su obavezni." },
      { status: 400 }
    );
  }

  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();
  const trimmedUrl = url?.trim() || undefined;

  let sentCount = 0;

  if (user.role === "ADMIN") {
    if (!audience || !ADMIN_AUDIENCES.includes(audience as (typeof ADMIN_AUDIENCES)[number])) {
      return NextResponse.json({ error: "Neispravna ciljna grupa." }, { status: 400 });
    }

    switch (audience) {
      case "ALL":
        sentCount = await notifyAllUsers(trimmedTitle, trimmedMessage, trimmedUrl);
        break;
      case "SELECTED":
        if (!userIds?.length) {
          return NextResponse.json(
            { error: "Odaberi barem jednog korisnika." },
            { status: 400 }
          );
        }
        sentCount = await notifyUsers(userIds, trimmedTitle, trimmedMessage, trimmedUrl);
        break;
      default:
        sentCount = await notifyUsersByRole(
          [audience as UserRole],
          trimmedTitle,
          trimmedMessage,
          trimmedUrl
        );
    }
  } else if (user.role === "MANAGER") {
    if (!audience || !MANAGER_AUDIENCES.includes(audience as (typeof MANAGER_AUDIENCES)[number])) {
      return NextResponse.json({ error: "Neispravna ciljna grupa." }, { status: 400 });
    }

    if (audience === "ALL_COMMERCIALS") {
      sentCount = await notifyAllCommercials(trimmedTitle, trimmedMessage, trimmedUrl);
    } else {
      if (!userIds?.length) {
        return NextResponse.json(
          { error: "Odaberi barem jednog komercijalistu." },
          { status: 400 }
        );
      }
      const commercials = await prisma.user.findMany({
        where: { id: { in: userIds }, role: "COMMERCIAL" },
        select: { id: true },
      });
      sentCount = await notifyUsers(
        commercials.map((c) => c.id),
        trimmedTitle,
        trimmedMessage,
        trimmedUrl
      );
    }
  } else {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await logAudit(req, { id: user.id }, {
    action: "SEND_NOTIFICATION",
    entityType: "Notification",
    metadata: {
      audience,
      sentCount,
      title: trimmedTitle,
    },
  });

  return NextResponse.json({
    success: true,
    sentCount,
  });
}
