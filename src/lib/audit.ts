import { NextRequest } from "next/server";
import { prisma } from "./prisma";

type AuditOptions = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
};

export async function logAudit(
  req: NextRequest,
  user: { id: string } | null | undefined,
  options: AuditOptions
) {
  if (!user?.id) return;

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId ?? null,
        metadata: options.metadata ?? null,
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log", options.action, e);
  }
}


