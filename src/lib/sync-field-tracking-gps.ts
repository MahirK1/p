/**
 * Background sync za GPS podatke – gpsPositionLog i gpsIgnitionLog.
 * Koristi se od strane cron job-a da stalno preuzima podatke bez obzira
 * da li je neko na field-tracking stranici ili nije.
 */
import { prisma } from "@/lib/prisma";
import { fetchLocations, isNexGpsConfigured } from "@/lib/nex-gps";

function nexToDate(nexDt: unknown): Date | null {
  const d = nexDt as {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    seconds?: number;
  } | undefined;
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

export async function syncFieldTrackingGps(): Promise<{
  positionCount: number;
  ignitionUpdated: number;
}> {
  if (!isNexGpsConfigured()) {
    throw new Error("NEX GPS API nije konfiguriran. Provjerite NEX_GPS_* env varijable.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const commercials = await prisma.user.findMany({
    where: { role: "COMMERCIAL", nexDeviceId: { not: null } },
    select: { id: true, nexDeviceId: true },
  });
  const deviceToUser = new Map(
    commercials.map((c) => [c.nexDeviceId!, { id: c.id }] as const)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpsIgnitionLog = (prisma as any).gpsIgnitionLog;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpsPositionLog = (prisma as any).gpsPositionLog;

  if (!gpsPositionLog || !gpsIgnitionLog) {
    throw new Error(
      "GpsPositionLog i GpsIgnitionLog modeli nisu dostupni. Pokreni 'npx prisma generate'."
    );
  }

  const data = await fetchLocations();

  // 1. Prva paljenja za uređaje s ignition ON (samo danas)
  const earliestByDevice = new Map<string, Date>();
  const positionLogBatch: Array<{
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
    if (p.ignitionState !== "ON" || !deviceToUser.has(p.deviceId)) continue;
    const posDate = nexToDate(p.dateTime);
    if (!posDate) continue;
    const dateStr = posDate.toISOString().slice(0, 10);
    if (dateStr !== today) continue;
    const prev = earliestByDevice.get(p.deviceId);
    if (!prev || posDate < prev) earliestByDevice.set(p.deviceId, posDate);
  }

  for (const p of data.positionList ?? []) {
    const commercial = deviceToUser.get(p.deviceId);
    if (!commercial) continue;
    const posDate = nexToDate(p.dateTime);
    if (!posDate) continue;
    const dateStr = posDate.toISOString().slice(0, 10);
    if (dateStr !== today) continue;
    positionLogBatch.push({
      deviceId: p.deviceId,
      commercialId: commercial.id,
      date: dateStr,
      capturedAt: posDate,
      latitude: p.coordinate.latitude,
      longitude: p.coordinate.longitude,
      speed: p.speed ?? null,
      ignitionState: p.ignitionState ?? null,
    });
  }

  let positionCount = 0;
  if (positionLogBatch.length > 0) {
    await gpsPositionLog.createMany({
      data: positionLogBatch,
      skipDuplicates: true,
    });
    positionCount = positionLogBatch.length;
  }

  let ignitionUpdated = 0;
  if (earliestByDevice.size > 0) {
    const deviceIds = [...earliestByDevice.keys()];
    const existingLogs = await gpsIgnitionLog.findMany({
      where: { deviceId: { in: deviceIds }, date: today },
    });
    const existingByDevice = new Map(
      existingLogs.map(
        (log: { deviceId: string; firstIgnitionAt: Date }) => [log.deviceId, log]
      )
    );

    for (const [deviceId, posDate] of earliestByDevice) {
      const existing = existingByDevice.get(deviceId) as
        | { firstIgnitionAt: Date }
        | undefined;
      if (!existing) {
        await gpsIgnitionLog.upsert({
          where: { deviceId_date: { deviceId, date: today } },
          create: { deviceId, date: today, firstIgnitionAt: posDate },
          update: {},
        });
        ignitionUpdated++;
      } else if (posDate < existing.firstIgnitionAt) {
        await gpsIgnitionLog.update({
          where: { deviceId_date: { deviceId, date: today } },
          data: { firstIgnitionAt: posDate },
        });
        ignitionUpdated++;
      }
    }
  }

  return { positionCount, ignitionUpdated };
}
