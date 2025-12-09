import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  
  // Admin može sve, Manager može vidjeti COMMERCIAL korisnike
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const where: any = {};
  if (role) {
    where.role = role;
  }

  // Manager može vidjeti samo COMMERCIAL korisnike
  if (user.role === "MANAGER") {
    if (role && role !== "COMMERCIAL") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
    where.role = "COMMERCIAL";
  } else if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "Sva polja su obavezna." },
      { status: 400 }
    );
  }

  // Provjeri da li email već postoji
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email već postoji." },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { id, name, email, role, password } = body;

  if (!id || !name || !email || !role) {
    return NextResponse.json(
      { error: "ID, ime, email i uloga su obavezni." },
      { status: 400 }
    );
  }

  // Provjeri da li email već postoji kod drugog korisnika
  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email već postoji kod drugog korisnika." },
      { status: 400 }
    );
  }

  const updateData: any = {
    name,
    email,
    role,
  };

  if (password && password.trim().length > 0) {
    updateData.password = await hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updatedUser);
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
      { error: "ID korisnika je obavezan." },
      { status: 400 }
    );
  }

  // Ne dozvoli brisanje samog sebe
  if (id === user.id) {
    return NextResponse.json(
      { error: "Ne možete obrisati samog sebe." },
      { status: 400 }
    );
  }

  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}