import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { fetchWorkdayPeriod, fetchEntryAttendanceSync, isAttendoConfigured } from "@/lib/attendo";
import { fetchLocations, isNexGpsConfigured } from "@/lib/nex-gps";

// CLOCK_IN=0, CLOCK_OUT=1 - iz Attendo registrationType enum
const CLOCK_IN = 0;
const CLOCK_OUT = 1;

function normalizeRegistrationType(type: unknown): "CLOCK_IN" | "CLOCK_OUT" | "UNKNOWN" {
  if (type === "CLOCK_IN" || type === CLOCK_IN) return "CLOCK_IN";
  if (type === "CLOCK_OUT" || type === CLOCK_OUT) return "CLOCK_OUT";
  return "UNKNOWN";
}

function matchesAttendoId(empId: number | string | undefined, ourId: string | null): boolean {
  if (!ourId) return false;
  const a = Number(empId);
  const b = Number(ourId);
  if (isNaN(a) || isNaN(b)) return String(empId) === String(ourId);
  return a === b;
}

function isValidDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { role: string };
  if (!["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(req.url);
  const selectedDate = isValidDateParam(searchParams.get("date")) ? searchParams.get("date")! : today;

  // Samo komercijalisti s attendoEmployeeId ili nexDeviceId
  const commercials = await prisma.user.findMany({
    where: {
      role: "COMMERCIAL",
      OR: [
        { attendoEmployeeId: { not: null } },
        { nexDeviceId: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      attendoEmployeeId: true,
      nexDeviceId: true,
    },
  });

  const result: Array<{
    commercialId: string;
    name: string;
    registrationType: "CLOCK_IN" | "CLOCK_OUT" | "UNKNOWN";
    attendoStatus: "on_work" | "off_work" | "unknown";
    lastActivityAt: string | null;
    clockInTime: string | null;
    clockOutTime: string | null;
    regularWork: string | null;
    businessOut: string | null;
    overtime: string | null;
    absence: string | null;
    days: any[];
    gps: {
      latitude: number;
      longitude: number;
      speed: number | null;
      ignitionState: string | null;
      lastUpdate: string | null;
      firstIgnitionAt: string | null; // Prvo uočeno paljenje vozila danas (ISO)
      clockInVsGpsDiffMinutes: number | null; // Razlika: Attendo prijava − GPS paljenje (poz = prijava poslije auta)
    } | null;
    todayVisits: Array<{
      id: string;
      clientId: string;
      clientName: string;
      scheduledAt: string;
      status: string;
      address: string | null;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
    }>;
  }> = [];

  // Inicijaliziraj sve komercijaliste
  for (const c of commercials) {
    result.push({
      commercialId: c.id,
      name: c.name,
      registrationType: "UNKNOWN",
      attendoStatus: "unknown",
      lastActivityAt: null,
      clockInTime: null,
      clockOutTime: null,
      regularWork: null,
      businessOut: null,
      overtime: null,
      absence: null,
      days: [],
      gps: null,
      todayVisits: [],
    });
  }

  // 1. Attendo workdays za danas
  if (isAttendoConfigured()) {
    try {
      const monthStart = new Date(`${selectedDate}T00:00:00Z`);
      monthStart.setUTCDate(1);
      const fromDate = monthStart.toISOString().slice(0, 10);
      const workdays = await fetchWorkdayPeriod(fromDate, selectedDate);
      const allowedIds = new Set(commercials.map((c) => c.attendoEmployeeId).filter(Boolean));

      for (const w of workdays as any[]) {
        const empId = w?.employee?.id;
        const commercial = commercials.find((c) => matchesAttendoId(empId, c.attendoEmployeeId));
        if (!commercial) continue;

        const allDays = Array.isArray(w.days) ? w.days : [];
        const entry = result.find((r) => r.commercialId === commercial.id);
        if (!entry) continue;

        entry.days = allDays;
        const day = allDays.find((d: any) => d?.date === selectedDate) ?? allDays[0];
        if (!day) continue;

        // clockInTime: koristi day.clockInTime ili izvuci iz prvog CLOCK_IN u entries
        let clockInTime = day.clockInTime ?? null;
        if (!clockInTime && Array.isArray(day.entries)) {
          const firstClockIn = day.entries.find(
            (e: any) => e?.registrationType === "CLOCK_IN" || e?.registrationType === 0
          );
          clockInTime = firstClockIn?.dateTime ?? null;
        }
        entry.clockInTime = clockInTime;

        // clockOutTime: day.clockOutTime ili zadnji CLOCK_OUT iz entries
        let clockOutTime = day.clockOutTime ?? null;
        if (!clockOutTime && Array.isArray(day.entries)) {
          const clockOuts = day.entries.filter(
            (e: any) => e?.registrationType === "CLOCK_OUT" || e?.registrationType === 1
          );
          const lastClockOut = clockOuts[clockOuts.length - 1];
          clockOutTime = lastClockOut?.dateTime ?? null;
        }
        entry.clockOutTime = clockOutTime;
        entry.regularWork = day.calculation?.regularWork ?? null;
        entry.businessOut = day.calculation?.businessOut ?? null;
        entry.overtime = day.calculation?.overtime ?? null;
        if (day.absence?.absenceType?.name) {
          entry.absence = day.absence.absenceType.name;
        }

        // Fallback status: uzmi zadnji entry iz dana ako sync nije dao status
        if (entry.registrationType === "UNKNOWN" && Array.isArray(day.entries) && day.entries.length > 0) {
          const lastEntry = day.entries[day.entries.length - 1];
          entry.registrationType = normalizeRegistrationType(lastEntry?.registrationType);
        }
      }
    } catch (e) {
      console.error("Field tracking Attendo workdays:", e);
    }

    // 2. Entry Attendance Sync - zadnja aktivnost i status "na poslu"
    // Sync vraća starije prvo (ascending by id), pa uzimamo zadnji event po zaposleniku
    try {
      const syncData = await fetchEntryAttendanceSync(0);
      const list = syncData.entryAttendanceList ?? [];
      const lastByEmployee = new Map<string, { type: unknown; dateTime: string }>();

      for (const e of list) {
        const empId = e.employee?.id;
        if (empId == null) continue;
        const key = String(empId);
        lastByEmployee.set(key, {
          type: e.registrationType ?? -1,
          dateTime: e.dateTime ?? "",
        });
      }

      for (const commercial of commercials) {
        if (!commercial.attendoEmployeeId) continue;
        const entry = result.find((r) => r.commercialId === commercial.id);
        if (!entry) continue;
        for (const [empKey, last] of lastByEmployee) {
          if (matchesAttendoId(empKey as any, commercial.attendoEmployeeId)) {
            entry.lastActivityAt = last.dateTime;
            const normalized = normalizeRegistrationType(last.type);
            entry.attendoStatus = normalized === "CLOCK_IN" ? "on_work" : normalized === "CLOCK_OUT" ? "off_work" : "unknown";
            entry.registrationType = normalized;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Field tracking Attendo sync:", e);
    }
  }

  // 3. NEX GPS pozicije
  const isSelectedToday = selectedDate === today;
  let deviceFirstIgnition = new Map<string, Date>();
  if (isNexGpsConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GpsIgnitionLog model exists in schema; Prisma client type may be stale until `npx prisma generate` runs
      const gpsIgnitionLog = (prisma as any).gpsIgnitionLog;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GpsPositionLog model exists in schema; Prisma client type may be stale until `npx prisma generate` runs
      const gpsPositionLog = (prisma as any).gpsPositionLog;
      const data = await fetchLocations();
      const deviceToUser = new Map(
        commercials.filter((c) => c.nexDeviceId).map((c) => [c.nexDeviceId!, c])
      );

      // Parsiraj NEX dateTime u Date
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

      // Snimi prva paljenja za uređaje s ignition ON (samo mapirani, najranije vrijeme po uređaju)
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
        const prev = earliestByDevice.get(p.deviceId);
        if (!prev || posDate < prev) earliestByDevice.set(p.deviceId, posDate);
      }

      if (isSelectedToday) {
        for (const p of data.positionList ?? []) {
          const commercial = deviceToUser.get(p.deviceId);
          if (!commercial) continue;
          const posDate = nexToDate(p.dateTime);
          if (!posDate) continue;
          positionLogBatch.push({
            deviceId: p.deviceId,
            commercialId: commercial.id,
            date: posDate.toISOString().slice(0, 10),
            capturedAt: posDate,
            latitude: p.coordinate.latitude,
            longitude: p.coordinate.longitude,
            speed: p.speed ?? null,
            ignitionState: p.ignitionState ?? null,
          });
        }
        if (positionLogBatch.length > 0) {
          await gpsPositionLog.createMany({
            data: positionLogBatch,
            skipDuplicates: true,
          });
        }
      }

      if (earliestByDevice.size > 0 && isSelectedToday) {
        const deviceIds = [...earliestByDevice.keys()];
        const existingLogs = await gpsIgnitionLog.findMany({
          where: { deviceId: { in: deviceIds }, date: selectedDate },
        });
        const existingByDevice = new Map(
          existingLogs.map((log: { deviceId: string; firstIgnitionAt: Date }) => [log.deviceId, log])
        );

        for (const [deviceId, posDate] of earliestByDevice) {
          const existing = existingByDevice.get(deviceId) as { firstIgnitionAt: Date } | undefined;
          if (!existing) {
            await gpsIgnitionLog.upsert({
              where: { deviceId_date: { deviceId, date: selectedDate } },
              create: { deviceId, date: selectedDate, firstIgnitionAt: posDate },
              update: {},
            });
          } else if (posDate < existing.firstIgnitionAt) {
            await gpsIgnitionLog.update({
              where: { deviceId_date: { deviceId, date: selectedDate } },
              data: { firstIgnitionAt: posDate },
            });
          }
        }
      }

      // Dohvati sva prva paljenja za izabrani datum
      const deviceIds = [...deviceToUser.keys()];
      if (deviceIds.length > 0) {
        const logs = await gpsIgnitionLog.findMany({
          where: { deviceId: { in: deviceIds }, date: selectedDate },
        });
        for (const log of logs) {
          deviceFirstIgnition.set(log.deviceId, log.firstIgnitionAt);
        }
      }

      if (isSelectedToday) {
        for (const p of data.positionList ?? []) {
          const commercial = deviceToUser.get(p.deviceId);
          if (!commercial) continue;

          const entry = result.find((r) => r.commercialId === commercial.id);
          if (!entry) continue;

          const dt = p.dateTime;
          const lastUpdate = dt
            ? `${String(dt.day).padStart(2, "0")}.${String(dt.month).padStart(2, "0")}.${dt.year}. ${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`
            : null;

          const firstIgnitionAt = deviceFirstIgnition.get(p.deviceId);
          let clockInVsGpsDiffMinutes: number | null = null;
          if (entry.clockInTime && firstIgnitionAt) {
            const clockIn = new Date(entry.clockInTime).getTime();
            const gps = firstIgnitionAt.getTime();
            clockInVsGpsDiffMinutes = Math.round((clockIn - gps) / 60000);
          }

          entry.gps = {
            latitude: p.coordinate.latitude,
            longitude: p.coordinate.longitude,
            speed: p.speed ?? null,
            ignitionState: p.ignitionState ?? null,
            lastUpdate,
            firstIgnitionAt: firstIgnitionAt?.toISOString() ?? null,
            clockInVsGpsDiffMinutes,
          };
        }
      } else {
        const deviceIds = [...deviceToUser.keys()];
        if (deviceIds.length > 0) {
          const logs = await gpsPositionLog.findMany({
            where: { deviceId: { in: deviceIds }, date: selectedDate },
            orderBy: { capturedAt: "desc" },
          });
          const latestByDevice = new Map<string, any>();
          for (const log of logs) {
            if (!latestByDevice.has(log.deviceId)) latestByDevice.set(log.deviceId, log);
          }
          for (const [deviceId, log] of latestByDevice) {
            const commercial = deviceToUser.get(deviceId);
            if (!commercial) continue;
            const entry = result.find((r) => r.commercialId === commercial.id);
            if (!entry) continue;
            entry.gps = {
              latitude: log.latitude,
              longitude: log.longitude,
              speed: log.speed ?? null,
              ignitionState: log.ignitionState ?? null,
              lastUpdate: log.capturedAt
                ? new Date(log.capturedAt).toLocaleString("bs-BA")
                : null,
              firstIgnitionAt: null,
              clockInVsGpsDiffMinutes: null,
            };
          }
        }
      }
    } catch (e) {
      console.error("Field tracking NEX GPS:", e);
    }
  }

  // 4. Današnje posjete
  const startOfDay = new Date(`${selectedDate}T00:00:00`);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(`${selectedDate}T00:00:00`);
  endOfDay.setHours(23, 59, 59, 999);

  const commercialIds = commercials.map((c) => c.id);
  const visits = await prisma.visit.findMany({
    where: {
      commercialId: { in: commercialIds },
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      client: true,
      branches: { include: { branch: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  for (const v of visits) {
    const entry = result.find((r) => r.commercialId === v.commercialId);
    if (!entry) continue;
    const firstBranch = v.branches?.[0]?.branch;
    const address = firstBranch?.address ?? v.client.address ?? null;
    const city = firstBranch?.city ?? v.client.city ?? null;
    const latitude = firstBranch?.latitude ?? (v.client as any).latitude ?? null;
    const longitude = firstBranch?.longitude ?? (v.client as any).longitude ?? null;
    entry.todayVisits.push({
      id: v.id,
      clientId: v.clientId,
      clientName: v.client.name,
      scheduledAt: v.scheduledAt.toISOString(),
      status: v.status,
      address,
      city,
      latitude,
      longitude,
    });
  }

  return NextResponse.json({ commercials: result });
}
