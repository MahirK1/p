/**
 * Attendo API client - proxy za prisustvo komercijalista
 * Dokumentacija: src/api-dokumentacija/attendo_api_dokumentacija_2025-05-21.html
 */

const BASE = process.env.ATTENDO_API_BASE_URL?.replace(/\/$/, "") ?? "";
const API_KEY = process.env.ATTENDO_API_KEY ?? "";

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-KEY": API_KEY,
  };
}

export function isAttendoConfigured(): boolean {
  return Boolean(BASE && API_KEY);
}

/** EntryAttendance sync - check-in/check-out zapisi s paginacijom */
export async function fetchEntryAttendanceSync(lastId: number): Promise<{
  entryAttendanceList: Array<{
    id?: number;
    dateTime?: string;
    registrationType?: number;
    device?: { id?: number; code?: string; description?: string };
    employee?: { id?: number; number?: string; givenName?: string; familyName?: string; uid?: string; reference?: string };
  }>;
  lastId: number;
}> {
  const res = await fetch(`${BASE}/api/v1/attendance/entry-attendance/for-sync/simple/${lastId}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Attendo API error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Workday period - radni dani sa clockIn/clockOut i kalkulacijama */
export async function fetchWorkdayPeriod(
  fromDate: string,
  toDate: string,
  filters?: {
    organizationUnitId?: number;
    employeeGroupId?: number;
    jobTitleId?: number;
    qualificationId?: number;
    teamId?: number;
    siteId?: number;
    sort?: string;
  }
): Promise<unknown[]> {
  const params = new URLSearchParams({
    fromDate,
    toDate,
    ...(filters && Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== "") as [string, string][]
    )),
  });
  const res = await fetch(`${BASE}/api/v1/attendance/workday/period?${params}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Attendo API error ${res.status}: ${text}`);
  }
  return res.json();
}
