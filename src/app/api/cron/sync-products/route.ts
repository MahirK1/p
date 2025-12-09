import { NextRequest, NextResponse } from "next/server";
import { syncProducts } from "@/lib/sync-products";

export async function GET(req: NextRequest) {
  // Provjeri cron secret
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await syncProducts();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}