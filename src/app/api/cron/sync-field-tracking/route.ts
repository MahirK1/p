import { NextRequest, NextResponse } from "next/server";
import { syncFieldTrackingGps } from "@/lib/sync-field-tracking-gps";

export async function GET(req: NextRequest) {
  const authHeader =
    req.headers.get("Authorization") || req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await syncFieldTrackingGps();
    return NextResponse.json({
      success: true,
      positionCount: result.positionCount,
      ignitionUpdated: result.ignitionUpdated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Greška pri sinkronizaciji";
    console.error("Cron sync-field-tracking:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
