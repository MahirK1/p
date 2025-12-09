import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { syncProducts } from "@/lib/sync-products";

// GET - Za ručnu sinkronizaciju iz admin panela
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const result = await syncProducts();
    return NextResponse.json({
      success: true,
      stats: result,
    });
  } catch (error: any) {
    console.error("❌ Greška pri sinkronizaciji:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Greška pri sinkronizaciji proizvoda" 
      },
      { status: 500 }
    );
  }
}

// POST - Automatska sinkronizacija (može biti pozvana iz cron joba ili webhook-a)
export async function POST(req: NextRequest) {
  try {
    // Opciono: Provjeri autentikaciju za ručnu sinkronizaciju
    // Za automatsku sinkronizaciju, možeš koristiti API key u header-u
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.SYNC_API_KEY;

    // Ako nije admin i nema validan API key, odbij
    if (!apiKey || apiKey !== expectedApiKey) {
      const session = await getServerSession(authOptions);
      const role = (session?.user as any)?.role;
      if (!session || role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const result = await syncProducts();
    return NextResponse.json({
      success: true,
      stats: result,
    });
  } catch (error: any) {
    console.error("❌ Greška pri sinkronizaciji:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Greška pri sinkronizaciji proizvoda" 
      },
      { status: 500 }
    );
  }
}
