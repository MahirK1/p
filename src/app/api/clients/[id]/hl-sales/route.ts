import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !["ADMIN", "MANAGER", "DIRECTOR", "COMMERCIAL"].includes(role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id: clientId } = await context.params;

  const sales = await prisma.hlPartnerSale.findMany({
    where: { clientId },
    orderBy: { import: { periodFrom: "desc" } },
    take: 5,
    include: {
      import: {
        select: {
          id: true,
          periodFrom: true,
          periodTo: true,
          fileName: true,
        },
      },
      items: { orderBy: { lineNo: "asc" }, take: 20 },
    },
  });

  return NextResponse.json({ sales });
}
