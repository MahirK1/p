import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { fetchEntryAttendanceSync, isAttendoConfigured } from "@/lib/attendo";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { id: string; role: string };
  if (!["MANAGER", "ADMIN", "DIRECTOR", "COMMERCIAL"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isAttendoConfigured()) {
    return NextResponse.json(
      { error: "Attendo API nije konfiguriran. Provjerite ATTENDO_API_BASE_URL i ATTENDO_API_KEY." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const lastId = Number(searchParams.get("lastId") ?? "0") || 0;

  try {
    const data = await fetchEntryAttendanceSync(lastId);

    // Ako je COMMERCIAL, filtriraj samo njegove zapise (po attendoEmployeeId)
    if (user.role === "COMMERCIAL") {
      const me = await prisma.user.findUnique({
        where: { id: user.id },
        select: { attendoEmployeeId: true },
      });
      const myAttendoId = me?.attendoEmployeeId;
      if (!myAttendoId) {
        return NextResponse.json({
          entryAttendanceList: [],
          lastId: data.lastId ?? lastId,
        });
      }
      const filtered = (data.entryAttendanceList ?? []).filter(
        (e) => String(e.employee?.id) === myAttendoId
      );
      const maxId = filtered.length > 0
        ? Math.max(...filtered.map((e) => e.id ?? 0))
        : lastId;
      return NextResponse.json({
        entryAttendanceList: filtered,
        lastId: data.lastId ?? maxId ?? lastId,
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Attendo sync error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Greška pri dohvatu Attendo podataka." },
      { status: 502 }
    );
  }
}
