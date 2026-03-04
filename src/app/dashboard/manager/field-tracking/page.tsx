"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FieldTrackingMap } from "@/components/field-tracking/FieldTrackingMap";
import {
  MapPinIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

type Commercial = {
  commercialId: string;
  name: string;
  registrationType: "CLOCK_IN" | "CLOCK_OUT" | "UNKNOWN";
  lastActivityAt: string | null;
  clockInTime: string | null;
  clockOutTime: string | null;
  regularWork: string | null;
  businessOut: string | null;
  overtime: string | null;
  absence: string | null;
  days: AttendoDay[];
  gps: {
    latitude: number;
    longitude: number;
    speed: number | null;
    ignitionState: string | null;
    lastUpdate: string | null;
    firstIgnitionAt: string | null;
    clockInVsGpsDiffMinutes: number | null;
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
};

type AttendoEntry = {
  id?: number;
  dateTime?: string;
  registrationType?: string | number;
  device?: { id?: number; code?: string };
  modifiedBy?: { id?: number; email?: string };
};

type AttendoInterval = {
  id?: number;
  startAt?: string;
  endAt?: string;
  state?: string;
  type?: string;
  orderCol?: number;
};

type AttendoDay = {
  id?: number;
  state?: string;
  date?: string;
  weeklyRest?: boolean;
  workTime?: {
    id?: number;
    code?: string;
    type?: string;
    workStart?: string;
    workEnd?: string;
    workingHours?: string;
    advanced?: boolean;
  };
  workTimeSetter?: string;
  absenceSetter?: string;
  calculation?: Record<string, unknown>;
  intervals?: {
    id?: number;
    list?: AttendoInterval[];
    nightList?: AttendoInterval[];
  };
  entries?: AttendoEntry[];
  clockInTime?: string | null;
  clockOutTime?: string | null;
  absence?: {
    absenceType?: { name?: string };
  };
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDuration(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (!iso.startsWith("PT")) return iso;
  const hours = Number((/(\d+)H/.exec(iso) || [])[1] ?? 0);
  const minutes = Number((/(\d+)M/.exec(iso) || [])[1] ?? 0);
  const seconds = Number((/(\d+(?:\.\d+)?)S/.exec(iso) || [])[1] ?? 0);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes && seconds) parts.push(`${Math.round(seconds)}s`);
  if (parts.length === 0) return "0m";
  return parts.join(" ");
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("bs-BA");
}

function formatRegistrationType(t: AttendoEntry["registrationType"]): string {
  if (t === "CLOCK_IN" || t === 0) return "Prijava";
  if (t === "CLOCK_OUT" || t === 1) return "Odjava";
  return String(t ?? "—");
}

function StatusBadge({ status }: { status: Commercial["registrationType"] }) {
  if (status === "CLOCK_IN")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircleIcon className="h-4 w-4" />
        Na poslu
      </span>
    );
  if (status === "CLOCK_OUT")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
        <XCircleIcon className="h-4 w-4" />
        Odjavljen
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <QuestionMarkCircleIcon className="h-4 w-4" />
      Nepoznato
    </span>
  );
}

export default function FieldTrackingPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<{ commercials: Commercial[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommercial, setSelectedCommercial] = useState<Commercial | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pathPoints, setPathPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    const url = `/api/field-tracking?${params.toString()}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setData(null);
        } else {
          setData(d);
        }
      })
      .catch((err) => {
        setError(err?.message ?? "Greška pri učitavanju.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    if (!session) return;
    load();
  }, [session, load]);

  useEffect(() => {
    if (!session || !data) return;
    const t = setInterval(load, 90000); // osvježi svakih 90 sekundi
    return () => clearInterval(t);
  }, [session, data, load]);

  useEffect(() => {
    setSelectedCommercial(null);
  }, [selectedDate]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const mapPositions = (data?.commercials ?? [])
    .filter((c) => c.gps)
    .map((c) => ({
      latitude: c.gps!.latitude,
      longitude: c.gps!.longitude,
      name: c.name,
      speed: c.gps!.speed,
      ignitionState: c.gps!.ignitionState,
      todayVisits: c.todayVisits,
      commercialId: c.commercialId,
    }));

  const [geocodedVisits, setGeocodedVisits] = useState<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    if (!selectedCommercial) {
      setGeocodedVisits({});
      return;
    }
    const toGeocode = selectedCommercial.todayVisits.filter(
      (v) => (v.latitude == null || v.longitude == null) && (v.address || v.city)
    );
    if (toGeocode.length === 0) return;

    const next: Record<string, { lat: number; lng: number }> = {};
    let index = 0;
    const run = () => {
      if (index >= toGeocode.length) {
        setGeocodedVisits((prev) => ({ ...prev, ...next }));
        return;
      }
      const v = toGeocode[index++];
      const params = new URLSearchParams();
      if (v.address) params.set("address", v.address);
      if (v.city) params.set("city", v.city);
      fetch(`/api/geocode?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.latitude != null && d.longitude != null) {
            next[v.id] = { lat: d.latitude, lng: d.longitude };
          }
        })
        .finally(() => setTimeout(run, 1100));
    };
    run();
  }, [selectedCommercial?.commercialId]);

  const enrichedVisits = selectedCommercial?.todayVisits.map((v) => {
    const geo = geocodedVisits[v.id];
    return {
      ...v,
      latitude: v.latitude ?? geo?.lat ?? null,
      longitude: v.longitude ?? geo?.lng ?? null,
    };
  }) ?? [];

  const selectedPosition = selectedCommercial?.gps
    ? {
        latitude: selectedCommercial.gps.latitude,
        longitude: selectedCommercial.gps.longitude,
        name: selectedCommercial.name,
        speed: selectedCommercial.gps.speed,
        ignitionState: selectedCommercial.gps.ignitionState,
        todayVisits: enrichedVisits,
        commercialId: selectedCommercial.commercialId,
      }
    : null;

  const handleSelectPosition = useCallback(
    (p: { name: string; commercialId?: string } | null) => {
      if (!p) {
        setSelectedCommercial(null);
        return;
      }
      const c = (data?.commercials ?? []).find(
        (x) => x.name === p.name || x.commercialId === p.commercialId
      );
      setSelectedCommercial(c ?? null);
    },
    [data?.commercials]
  );

  useEffect(() => {
    if (!selectedCommercial || !selectedDate) {
      setPathPoints([]);
      setPathError(null);
      return;
    }
    setPathLoading(true);
    setPathError(null);
    const params = new URLSearchParams({
      commercialId: selectedCommercial.commercialId,
      date: selectedDate,
    });
    fetch(`/api/gps/history?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setPathPoints(d.points ?? []);
      })
      .catch((err) => {
        setPathError(err?.message ?? "Greška pri dohvatu putanje.");
        setPathPoints([]);
      })
      .finally(() => setPathLoading(false));
  }, [selectedCommercial?.commercialId, selectedDate]);
  
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Praćenje terena</h1>
          <p className="text-sm text-slate-500">
            Pregled prisustva, lokacija i posjeta komercijalista
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Datum
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Učitavam..." : "Osvježi"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-medium">
                <MapPinIcon className="h-5 w-5 text-slate-500" />
                Trenutne lokacije
              </h2>
              <p className="mb-2 text-xs text-slate-500">
                Klikni na markere komercijalista za prikaz lokacija apoteka i kartice s detaljima
              </p>
              <FieldTrackingMap
                positions={mapPositions}
                selectedPosition={selectedPosition}
                onSelectPosition={handleSelectPosition}
                pathPoints={pathPoints}
              />
            </div>

            {selectedCommercial && (
              <div className="w-full shrink-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:w-96">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{selectedCommercial.name}</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCommercial(null)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Zatvori"
                  >
                    ✕
                  </button>
                </div>
                <StatusBadge status={selectedCommercial.registrationType} />
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>Prijava: {formatTime(selectedCommercial.clockInTime)}</div>
                  <div>Odjava: {formatTime(selectedCommercial.clockOutTime)}</div>
                  <div>Rad: {formatDuration(selectedCommercial.regularWork)}</div>
                  <div>Prekovremeno: {formatDuration(selectedCommercial.overtime)}</div>
                  {selectedCommercial.gps && (
                    <div className="text-xs">
                      {selectedCommercial.gps.speed != null && `${selectedCommercial.gps.speed} km/h`}
                      {selectedCommercial.gps.ignitionState && ` • Motor: ${selectedCommercial.gps.ignitionState}`}
                    </div>
                  )}
                </div>
                
                {selectedCommercial.todayVisits.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <h4 className="mb-2 text-xs font-medium text-slate-500">
                      Današnje posjete ({selectedCommercial.todayVisits.length})
                    </h4>
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {selectedCommercial.todayVisits.map((v) => {
                        const visitDate = v.scheduledAt.slice(0, 10);
                        const hasCoords = v.latitude != null && v.longitude != null;
                        return (
                          <li
                            key={v.id}
                            className="rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1.5 text-xs"
                          >
                            <div className="font-medium text-slate-800">{v.clientName}</div>
                            <div className="text-slate-500">{formatTime(v.scheduledAt)}</div>
                            {(v.address || v.city) && (
                              <div className="truncate text-slate-500">
                                {[v.address, v.city].filter(Boolean).join(", ")}
                              </div>
                            )}
                            <div className="mt-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  v.status === "DONE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : v.status === "CANCELED"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {v.status === "DONE" ? "Završeno" : v.status === "CANCELED" ? "Otkazano" : "Planirano"}
                              </span>
                              {!hasCoords && (
                                <span className="ml-1 text-amber-600">(bez koordinata na mapi)</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      href={`/dashboard/manager/visits?from=${selectedCommercial.todayVisits[0]?.scheduledAt.slice(0, 10)}&to=${selectedCommercial.todayVisits[0]?.scheduledAt.slice(0, 10)}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Otvori posjete
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(data?.commercials ?? []).map((c) => (
              <div
                key={c.commercialId}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{c.name}</h3>
                  <StatusBadge status={c.registrationType} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ClockIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <span>Prijava: {formatTime(c.clockInTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <ClockIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <span>Odjava: {formatTime(c.clockOutTime)}</span>
                  </div>
                  {(c.regularWork || c.overtime) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.regularWork && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                          Rad: {formatDuration(c.regularWork)}
                        </span>
                      )}
                      {c.overtime && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Prekovremeno: {formatDuration(c.overtime)}
                        </span>
                      )}
                    </div>
                  )}
                  {c.absence && (
                    <div className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
                      Odsutnost: {c.absence}
                    </div>
                  )}
                  {c.gps && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {c.gps.speed != null ? `${c.gps.speed} km/h` : ""}
                          {c.gps.ignitionState && ` • Motor: ${c.gps.ignitionState}`}
                          {c.gps.lastUpdate && ` • ${c.gps.lastUpdate}`}
                        </span>
                      </div>
                      {(c.gps.firstIgnitionAt || c.gps.clockInVsGpsDiffMinutes != null) && (
                        <div className="rounded bg-slate-50 px-2 py-1.5 text-xs">
                          {c.gps.firstIgnitionAt && (
                            <div className="text-slate-600">
                              Auto upaljen: {formatTime(c.gps.firstIgnitionAt)}
                            </div>
                          )}
                          {c.gps.clockInVsGpsDiffMinutes != null && (
                            <div className="text-slate-700 font-medium mt-0.5">
                              {c.gps.clockInVsGpsDiffMinutes > 0
                                ? `Prijava ${c.gps.clockInVsGpsDiffMinutes} min nakon paljenja auta`
                                : c.gps.clockInVsGpsDiffMinutes < 0
                                ? `Prijava ${Math.abs(c.gps.clockInVsGpsDiffMinutes)} min prije paljenja auta`
                                : "Prijava i paljenje auta otprilike istovremeno"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {c.todayVisits.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Link
                      href={`/dashboard/manager/visits?from=${c.todayVisits[0].scheduledAt.slice(0, 10)}&to=${c.todayVisits[0].scheduledAt.slice(0, 10)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                      {c.todayVisits.length} posjeta danas — detalji na mapi
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data && data.commercials.length === 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500">
              Nema mapiranih komercijalista za praćenje.
            </div>
          )}
        </>
      )}
    </div>
  );
}
