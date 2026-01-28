import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Naziv brenda je obavezan." },
      { status: 400 }
    );
  }

  // Provjeri da li već postoji
  const existing = await prisma.brand.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Brend sa tim nazivom već postoji." },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.create({
    data: { name: name.trim() },
  });

  await logAudit(req, user, {
    action: "CREATE_BRAND",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name: brand.name },
  });

  return NextResponse.json(brand, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { id, name } = body;

  if (!id || !name || !name.trim()) {
    return NextResponse.json(
      { error: "ID i naziv su obavezni." },
      { status: 400 }
    );
  }

  // Provjeri da li već postoji drugi brend sa tim nazivom
  const existing = await prisma.brand.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Brend sa tim nazivom već postoji." },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: { name: name.trim() },
  });

  await logAudit(req, user, {
    action: "UPDATE_BRAND",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name: brand.name },
  });

  return NextResponse.json(brand);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID brenda je obavezan." },
      { status: 400 }
    );
  }

  // Provjeri da li brend ima povezane proizvode
  const productsCount = await prisma.product.count({
    where: { brandId: id },
  });

  if (productsCount > 0) {
    return NextResponse.json(
      { error: `Ne možete obrisati brend koji ima ${productsCount} proizvoda.` },
      { status: 400 }
    );
  }

  await prisma.brand.delete({
    where: { id },
  });

  await logAudit(req, user, {
    action: "DELETE_BRAND",
    entityType: "Brand",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}