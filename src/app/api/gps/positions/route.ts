import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { fetchLocations, isNexGpsConfigured } from "@/lib/nex-gps";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { id: string; role: string };
  if (!["MANAGER", "ADMIN", "DIRECTOR", "COMMERCIAL"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isNexGpsConfigured()) {
    return NextResponse.json(
      { error: "NEX GPS API nije konfiguriran. Provjerite NEX_GPS_* env varijable." },
      { status: 503 }
    );
  }

  try {
    const data = await fetchLocations();
    const { searchParams } = new URL(req.url);
    const commercialId = searchParams.get("commercialId");

    // Ako je commercialId zadan (manager/admin) ili COMMERCIAL vidi samo svoje
    if (user.role === "COMMERCIAL" || commercialId) {
      const targetId = user.role === "COMMERCIAL" ? user.id : commercialId!;
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { nexDeviceId: true, name: true },
      });
      const deviceId = targetUser?.nexDeviceId;
      if (!deviceId) {
        return NextResponse.json({ positionList: [] });
      }
      const filtered = (data.positionList ?? []).filter((p) => p.deviceId === deviceId);
      // Obogati s imenom komercijaliste
      const enriched = filtered.map((p) => ({
        ...p,
        commercialName: targetUser?.name,
        commercialId: targetId,
      }));
      return NextResponse.json({ positionList: enriched });
    }

    // Manager/Admin/Director bez filtera - vrati sve pozicije obogaćene s mapiranjem
    const commercialUsers = await prisma.user.findMany({
      where: {
        role: "COMMERCIAL",
        nexDeviceId: { not: null },
      },
      select: { id: true, name: true, nexDeviceId: true },
    });
    const deviceToUser = new Map(
      commercialUsers
        .filter((u) => u.nexDeviceId)
        .map((u) => [u.nexDeviceId!, u])
    );

    const enriched = (data.positionList ?? []).map((p) => {
      const u = deviceToUser.get(p.deviceId);
      return {
        ...p,
        commercialId: u?.id ?? null,
        commercialName: u?.name ?? null,
      };
    });

    return NextResponse.json({ positionList: enriched });
  } catch (err: any) {
    console.error("NEX GPS positions error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Greška pri dohvatu NEX GPS pozicija." },
      { status: 502 }
    );
  }
}
