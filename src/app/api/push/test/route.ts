import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToUser } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  
  try {
    // Provjeri da li korisnik ima subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({
        error: "No push subscription found",
        message: "Please enable push notifications first",
      });
    }

    // Pošalji test notifikaciju
    const result = await sendPushNotificationToUser(
      user.id,
      "Test notifikacija",
      "Ovo je test push notifikacija!",
      {
        url: "/dashboard/commercial/chat",
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test notification sent!",
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.reason || result.error,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
