import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { brand: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    sku,
    catalogNumber,
    brandId,
    stock,
    price,
    description,
  } = body;

  if (!name || !sku) {
    return NextResponse.json(
      { error: "Naziv i SKU su obavezni." },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      catalogNumber,
      brandId: brandId || null,
      stock: Number(stock) || 0,
      price: price ? Number(price) : null,
      description,
    },
    include: { brand: true },
  });

  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    name,
    sku,
    catalogNumber,
    brandId,
    stock,
    price,
    description,
  } = body;
  if (!id) {
    return NextResponse.json(
      { error: "ID proizvoda je obavezan." },
      { status: 400 }
    );
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      sku,
      catalogNumber,
      brandId: brandId || null,
      stock: Math.max(0, Number(stock) || 0),
      price: price ? Number(price) : null,
      description,
    },
    include: { brand: true },
  });

  return NextResponse.json(product);
}