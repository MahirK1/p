import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET - Dobavi sve settings ili specifičan setting po ključu
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key) {
    const setting = await prisma.appSetting.findUnique({
      where: { key },
    });
    return NextResponse.json(setting || { key, value: "" });
  }

  const settings = await prisma.appSetting.findMany();
  return NextResponse.json(settings);
}

// PUT - Ažuriraj ili kreiraj setting
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json(
      { error: "Ključ (key) je obavezan." },
      { status: 400 }
    );
  }

  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await logAudit(req, session.user as any, {
    action: "UPSERT_SETTING",
    entityType: "AppSetting",
    entityId: setting.id,
    metadata: {
      key: setting.key,
      value: setting.value,
    },
  });

  return NextResponse.json(setting);
}
