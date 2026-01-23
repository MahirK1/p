import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { syncClients } from "@/lib/sync-clients";
import { syncBranches } from "@/lib/sync-branches";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.SYNC_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      const session = await getServerSession(authOptions);
      const role = (session?.user as any)?.role;
      if (!session || role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Prvo sinkronizuj klijente
    console.log("🔄 Počinje sinkronizacija klijenata...");
    const clientsStats = await syncClients();

    // Zatim sinkronizuj lokacije
    console.log("🔄 Počinje sinkronizacija lokacija...");
    const branchesStats = await syncBranches();

    return NextResponse.json({
      success: true,
      clients: clientsStats,
      branches: branchesStats,
    });
  } catch (error: any) {
    console.error("❌ Greška pri sinkronizaciji:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Greška pri sinkronizaciji klijenata",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return POST(req);
}
