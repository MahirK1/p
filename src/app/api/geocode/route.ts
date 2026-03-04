import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

/**
 * GET /api/geocode?address=&city=
 * Nominatim (OpenStreetMap) geocoding. Za posjete bez koordinata u bazi.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();
  const city = searchParams.get("city")?.trim();

  if (!address && !city) {
    return NextResponse.json({ error: "address ili city obavezno" }, { status: 400 });
  }

  const q = [address, city].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PortalV2/1.0" },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) {
      return NextResponse.json({ latitude: null, longitude: null });
    }
    return NextResponse.json({
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
    });
  } catch (e) {
    console.error("Geocode error:", e);
    return NextResponse.json(
      { error: "Geocoding nije uspio" },
      { status: 502 }
    );
  }
}
