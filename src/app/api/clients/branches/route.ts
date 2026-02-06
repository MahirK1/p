import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (!["COMMERCIAL", "MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    clientId,
    name,
    address,
    city,
    phone,
    email,
    contactPerson,
    idBroj,
    zipCode,
  } = body;

  if (!clientId || !name || !name.trim()) {
    return NextResponse.json(
      { error: "ID klijenta i naziv podružnice su obavezni." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Klijent ne postoji." }, { status: 404 });
  }

  const branch = await prisma.clientBranch.create({
    data: {
      clientId,
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      contactPerson: contactPerson?.trim() || null,
      idBroj: idBroj?.trim() || null,
      zipCode: zipCode?.trim() || null,
    },
    include: { client: true },
  });

  return NextResponse.json(branch, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (!["COMMERCIAL", "MANAGER", "ADMIN", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    name,
    address,
    city,
    phone,
    email,
    contactPerson,
    idBroj,
    zipCode,
  } = body;

  if (!id) {
    return NextResponse.json(
      { error: "ID podružnice je obavezan." },
      { status: 400 }
    );
  }

  const existingBranch = await prisma.clientBranch.findUnique({
    where: { id },
  });

  if (!existingBranch) {
    return NextResponse.json(
      { error: "Podružnica ne postoji." },
      { status: 404 }
    );
  }

  const updatedBranch = await prisma.clientBranch.update({
    where: { id },
    data: {
      name: name ?? existingBranch.name,
      address: address !== undefined ? address : existingBranch.address,
      city: city !== undefined ? city : existingBranch.city,
      phone: phone !== undefined ? phone : existingBranch.phone,
      email: email !== undefined ? email : existingBranch.email,
      contactPerson: contactPerson !== undefined ? contactPerson : existingBranch.contactPerson,
      idBroj: idBroj !== undefined ? idBroj : existingBranch.idBroj,
      zipCode: zipCode !== undefined ? zipCode : existingBranch.zipCode,
    },
    include: {
      client: true,
    },
  });

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_CLIENT_BRANCH",
        entityType: "ClientBranch",
        entityId: updatedBranch.id,
        metadata: {
          clientId: updatedBranch.clientId,
          before: {
            name: existingBranch.name,
            address: existingBranch.address,
            city: existingBranch.city,
            phone: existingBranch.phone,
            email: existingBranch.email,
            contactPerson: existingBranch.contactPerson,
            idBroj: existingBranch.idBroj,
            zipCode: existingBranch.zipCode,
          },
          after: {
            name: updatedBranch.name,
            address: updatedBranch.address,
            city: updatedBranch.city,
            phone: updatedBranch.phone,
            email: updatedBranch.email,
            contactPerson: updatedBranch.contactPerson,
            idBroj: updatedBranch.idBroj,
            zipCode: updatedBranch.zipCode,
          },
        },
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log for branch update", e);
  }

  return NextResponse.json(updatedBranch);
}
