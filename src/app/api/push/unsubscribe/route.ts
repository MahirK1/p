import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId je obavezan" },
        { status: 400 }
      );
    }

    // Obriši subscription iz baze
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Greška pri brisanju subscriptiona" },
      { status: 500 }
    );
  }
}
