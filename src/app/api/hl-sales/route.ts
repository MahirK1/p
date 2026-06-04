import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { importHlSalesFromBuffer } from "@/lib/import-hl-sales";

const VIEW_ROLES = ["ADMIN", "MANAGER", "DIRECTOR", "COMMERCIAL"];
const UPLOAD_ROLES = ["ADMIN", "MANAGER"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { role?: string };
  if (!user.role || !VIEW_ROLES.includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const importId = searchParams.get("importId");
  const search = searchParams.get("search")?.trim();
  const onlyMatched = searchParams.get("onlyMatched") === "1";
  const onlyUnmatched = searchParams.get("onlyUnmatched") === "1";

  if (!importId) {
    const imports = await prisma.hlSalesImport.findMany({
      orderBy: { periodFrom: "desc" },
      select: {
        id: true,
        periodFrom: true,
        periodTo: true,
        grandTotal: true,
        grandQuantity: true,
        fileName: true,
        importedAt: true,
        _count: { select: { partnerSales: true } },
      },
    });
    return NextResponse.json({ imports });
  }

  const imp = await prisma.hlSalesImport.findUnique({
    where: { id: importId },
    include: {
      partnerSales: {
        where: {
          ...(onlyMatched ? { clientId: { not: null } } : {}),
          ...(onlyUnmatched ? { clientId: null } : {}),
          ...(search
            ? {
                partnerName: { contains: search, mode: "insensitive" },
              }
            : {}),
        },
        orderBy: { totalValue: "desc" },
        include: {
          client: { select: { id: true, name: true, city: true } },
          items: { orderBy: { lineNo: "asc" } },
        },
      },
    },
  });

  if (!imp) {
    return NextResponse.json({ error: "Uvoz nije pronađen." }, { status: 404 });
  }

  return NextResponse.json(imp);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { role?: string };
  if (!user.role || !UPLOAD_ROLES.includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Pošalji Excel fajl u polju 'file'." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await importHlSalesFromBuffer(buffer, file.name);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Greška pri uvozu Excela.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
