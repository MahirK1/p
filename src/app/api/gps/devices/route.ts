import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { fetchDevices, isNexGpsConfigured } from "@/lib/nex-gps";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as { role: string };
  if (!["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isNexGpsConfigured()) {
    return NextResponse.json(
      { error: "NEX GPS API nije konfiguriran. Provjerite NEX_GPS_* env varijable." },
      { status: 503 }
    );
  }

  try {
    const data = await fetchDevices();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("NEX GPS devices error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Greška pri dohvatu NEX GPS uređaja." },
      { status: 502 }
    );
  }
}
