import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToUser } from "@/lib/push-notifications";

export async function createInAppNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  return prisma.notification.create({
    data: { userId, title, body, url: url ?? null },
  });
}

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  await createInAppNotification(userId, title, body, url);
  await sendPushNotificationToUser(userId, title, body, url ? { url } : undefined);
}

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  url?: string
) {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((id) => notifyUser(id, title, body, url)));
  return unique.length;
}

export async function notifyUsersByRole(
  roles: UserRole[],
  title: string,
  body: string,
  url?: string
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });
  return notifyUsers(
    users.map((u) => u.id),
    title,
    body,
    url
  );
}

export async function notifyAllUsers(
  title: string,
  body: string,
  url?: string
) {
  const users = await prisma.user.findMany({ select: { id: true } });
  return notifyUsers(
    users.map((u) => u.id),
    title,
    body,
    url
  );
}

export async function notifyAllManagers(
  title: string,
  body: string,
  url?: string
) {
  return notifyUsersByRole(["MANAGER"], title, body, url);
}

export async function notifyAllCommercials(
  title: string,
  body: string,
  url?: string
) {
  return notifyUsersByRole(["COMMERCIAL"], title, body, url);
}
