import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

function isValidDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { id: string; role: string };
  if (!["MANAGER", "ADMIN", "DIRECTOR", "COMMERCIAL"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const date = isValidDateParam(searchParams.get("date")) ? searchParams.get("date")! : today;
  const commercialId = user.role === "COMMERCIAL" ? user.id : searchParams.get("commercialId");

  if (!commercialId) {
    return NextResponse.json({ points: [] });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: commercialId },
    select: { nexDeviceId: true },
  });

  const deviceId = targetUser?.nexDeviceId;
  if (!deviceId) {
    return NextResponse.json({ points: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GpsPositionLog model exists in schema; Prisma client type may be stale until `npx prisma generate` runs
  const gpsPositionLog = (prisma as any).gpsPositionLog;
  const logs = await gpsPositionLog.findMany({
    where: { deviceId, date },
    orderBy: { capturedAt: "asc" },
  });

  const points = (logs ?? []).map((log: any) => ({
    latitude: log.latitude,
    longitude: log.longitude,
    capturedAt: log.capturedAt,
    speed: log.speed ?? null,
    ignitionState: log.ignitionState ?? null,
  }));

  return NextResponse.json({ points });
}
