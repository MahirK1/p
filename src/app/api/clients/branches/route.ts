import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  if (!["COMMERCIAL", "ADMIN"].includes(user.role)) {
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

  return NextResponse.json(updatedBranch);
}
