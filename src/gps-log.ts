import { prisma } from "@/lib/prisma";
import { fetchLocations, isNexGpsConfigured } from "@/lib/nex-gps";

function nexToDate(nexDt: unknown): Date | null {
  const d = nexDt as { year?: number; month?: number; day?: number; hour?: number; minute?: number; seconds?: number } | undefined;
  if (!d) return null;
  const x = new Date(
    d.year ?? 0,
    (d.month ?? 1) - 1,
    d.day ?? 1,
    d.hour ?? 0,
    d.minute ?? 0,
    d.seconds ?? 0
  );
  return isNaN(x.getTime()) ? null : x;
}

async function run() {
  if (!isNexGpsConfigured()) {
    throw new Error("NEX GPS API nije konfiguriran. Provjerite NEX_GPS_* env varijable.");
  }

  const data = await fetchLocations();
  const commercials = await prisma.user.findMany({
    where: { role: "COMMERCIAL", nexDeviceId: { not: null } },
    select: { id: true, nexDeviceId: true },
  });
  const deviceToUser = new Map(commercials.map((c) => [c.nexDeviceId!, c.id]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GpsPositionLog model exists in schema; Prisma client type may be stale until `npx prisma generate` runs
  const gpsPositionLog = (prisma as any).gpsPositionLog;
  if (!gpsPositionLog) {
    throw new Error(
      "GpsPositionLog model nije dostupan. Pokreni 'npx prisma migrate deploy' i 'npx prisma generate' prije skripte."
    );
  }

  const batch: Array<{
    deviceId: string;
    commercialId: string | null;
    date: string;
    capturedAt: Date;
    latitude: number;
    longitude: number;
    speed: number | null;
    ignitionState: string | null;
  }> = [];

  for (const p of data.positionList ?? []) {
    const commercialId = deviceToUser.get(p.deviceId);
    if (!commercialId) continue;
    const posDate = nexToDate(p.dateTime);
    if (!posDate) continue;
    batch.push({
      deviceId: p.deviceId,
      commercialId,
      date: posDate.toISOString().slice(0, 10),
      capturedAt: posDate,
      latitude: p.coordinate.latitude,
      longitude: p.coordinate.longitude,
      speed: p.speed ?? null,
      ignitionState: p.ignitionState ?? null,
    });
  }

  if (batch.length > 0) {
    await gpsPositionLog.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`GPS log saved: ${batch.length} positions`);
}

run()
  .catch((err) => {
    console.error("GPS log error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
