import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { fetchWorkdayPeriod, isAttendoConfigured } from "@/lib/attendo";
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
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const commercialId = searchParams.get("commercialId");

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { error: "fromDate i toDate su obavezni (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  try {
    const filters: Record<string, number | string> = {};
    const teamId = searchParams.get("teamId");
    const organizationUnitId = searchParams.get("organizationUnitId");
    if (teamId) filters.teamId = Number(teamId);
    if (organizationUnitId) filters.organizationUnitId = Number(organizationUnitId);

    let workdays = await fetchWorkdayPeriod(fromDate, toDate, filters as any);

    // Pomocna funkcija: usporedba Attendo employee.id (može biti number) s našim attendoEmployeeId (string, npr. "027" ili "27")
    const matchesAttendoId = (empId: number | string | undefined, ourId: string | null) => {
      if (!ourId) return false;
      const a = Number(empId);
      const b = Number(ourId);
      if (isNaN(a) || isNaN(b)) return String(empId) === String(ourId);
      return a === b;
    };

    // Samo komercijalisti s attendoEmployeeId - dohvati njihove ID-eve
    const mappedCommercials = await prisma.user.findMany({
      where: { role: "COMMERCIAL", attendoEmployeeId: { not: null } },
      select: { attendoEmployeeId: true },
    });
    const allowedAttendoIds = new Set(
      mappedCommercials.map((u) => u.attendoEmployeeId!).filter(Boolean)
    );

    // Filtriranje po commercialId ili samo našim mapiranim zaposlenicima
    if (commercialId && (user.role === "MANAGER" || user.role === "ADMIN" || user.role === "DIRECTOR")) {
      const targetUser = await prisma.user.findUnique({
        where: { id: commercialId },
        select: { attendoEmployeeId: true },
      });
      const attendoId = targetUser?.attendoEmployeeId;
      if (attendoId) {
        workdays = (workdays as any[]).filter((w) =>
          matchesAttendoId((w as any).employee?.id, attendoId)
        );
      } else {
        workdays = [];
      }
    } else if (user.role === "COMMERCIAL") {
      const me = await prisma.user.findUnique({
        where: { id: user.id },
        select: { attendoEmployeeId: true },
      });
      const myAttendoId = me?.attendoEmployeeId;
      if (!myAttendoId) {
        workdays = [];
      } else {
        workdays = (workdays as any[]).filter((w) =>
          matchesAttendoId((w as any).employee?.id, myAttendoId)
        );
      }
    } else {
      // Manager/Admin/Director – "Svi" – prikaži samo naše 3 mapirane
      workdays = (workdays as any[]).filter((w) => {
        const empId = (w as any).employee?.id;
        return [...allowedAttendoIds].some((aid) => matchesAttendoId(empId, aid));
      });
    }

    return NextResponse.json(workdays);
  } catch (err: any) {
    console.error("Attendo workdays error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Greška pri dohvatu Attendo radnih dana." },
      { status: 502 }
    );
  }
}
