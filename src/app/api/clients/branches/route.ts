import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  // Dozvoli COMMERCIAL, MANAGER i ADMIN da ažuriraju podružnice
  if (!["COMMERCIAL", "MANAGER", "ADMIN"].includes(user.role)) {
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
      address: address ?? existingBranch.address,
      city: city ?? existingBranch.city,
      phone: phone ?? existingBranch.phone,
      email: email ?? existingBranch.email,
      contactPerson: contactPerson ?? existingBranch.contactPerson,
      zipCode: zipCode ?? existingBranch.zipCode,
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
            zipCode: existingBranch.zipCode,
          },
          after: {
            name: updatedBranch.name,
            address: updatedBranch.address,
            city: updatedBranch.city,
            phone: updatedBranch.phone,
            email: updatedBranch.email,
            contactPerson: updatedBranch.contactPerson,
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
