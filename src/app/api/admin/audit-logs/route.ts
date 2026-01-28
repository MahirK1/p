import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limitParam = searchParams.get("limit");
  const download = searchParams.get("download") === "1";

  const take = Math.min(Number(limitParam) || 200, 1000);

  const where: any = {};
  if (userId) {
    where.userId = userId;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      // uključivo do kraja dana
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  if (download) {
    // Generiši TXT sadržaj
    const lines: string[] = [];
    lines.push(
      "# Audit log",
      `# Generisano: ${new Date().toISOString()}`,
      userId ? `# Filter korisnik: ${userId}` : "# Filter korisnik: svi",
      from ? `# Od: ${from}` : "# Od: -",
      to ? `# Do: ${to}` : "# Do: -",
      ""
    );

    for (const log of logs.reverse()) {
      const ts = log.createdAt.toISOString();
      const uName = log.user?.name || "Nepoznat";
      const uEmail = log.user?.email || "";
      const entity = `${log.entityType}${log.entityId ? `(${log.entityId})` : ""}`;

      lines.push(
        `=== ${ts} ===`,
        `Korisnik: ${uName} <${uEmail}> [${log.userId}]`,
        `Akcija: ${log.action}`,
        `Entitet: ${entity}`
      );

      if (log.ip) {
        lines.push(`IP: ${log.ip}`);
      }
      if (log.userAgent) {
        lines.push(`User-Agent: ${log.userAgent}`);
      }

      if (log.metadata) {
        try {
          const pretty = JSON.stringify(log.metadata, null, 2);
          lines.push("Detalji:", pretty);
        } catch {
          lines.push("Detalji: [ne može se parsirati]");
        }
      }

      lines.push(""); // prazna linija između zapisa
    }

    const body = lines.join("\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.txt"`,
      },
    });
  }

  return NextResponse.json(
    logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      },
      metadata: log.metadata,
      ip: log.ip,
      userAgent: log.userAgent,
    }))
  );
}


