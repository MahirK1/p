/**
 * NEX GPS (EuropeTracking) API client - proxy za praćenje vozila
 * Dokumentacija: src/api-dokumentacija/NEX-API_Provider.pdf
 */

const BASE = process.env.NEX_GPS_BASE_URL?.replace(/\/$/, "") ?? "";
const USERNAME = process.env.NEX_GPS_USERNAME ?? "";
const PASSWORD = process.env.NEX_GPS_PASSWORD ?? "";

function isConfigured(): boolean {
  return Boolean(BASE && USERNAME && PASSWORD);
}

export { isConfigured as isNexGpsConfigured };

/** Verzija API-ja */
export async function fetchVersion(): Promise<{ version: string }> {
  const res = await fetch(`${BASE}/index.php?sel=version`);
  if (!res.ok) throw new Error(`NEX GPS error ${res.status}`);
  return res.json();
}

/** Lista svih uređaja (vozila) za korisnika */
export async function fetchDevices(): Promise<{
  deviceList: Array<{ deviceId: string; deviceName: string }>;
}> {
  const url = `${BASE}/index.php?user=${encodeURIComponent(USERNAME)}&pass=${encodeURIComponent(PASSWORD)}&sel=devices`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new Error("NEX GPS: Invalid Credentials");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NEX GPS error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { deviceList: data.deviceList ?? [] };
}

/** Trenutne pozicije svih uređaja */
export async function fetchLocations(): Promise<{
  positionList: Array<{
    deviceId: string;
    coordinate: { latitude: number; longitude: number };
    heading?: number;
    speed?: number;
    ignitionState?: "ON" | "OFF" | "UNKNOWN";
    dateTime: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      seconds: number;
      timezone: string;
    };
  }>;
}> {
  const url = `${BASE}/index.php?user=${encodeURIComponent(USERNAME)}&pass=${encodeURIComponent(PASSWORD)}&sel=locations`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new Error("NEX GPS: Invalid Credentials");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NEX GPS error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { positionList: data.positionList ?? [] };
}
