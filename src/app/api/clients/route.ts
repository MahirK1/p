import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Ako se traži pojedinačni klijent
  if (id) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        branches: {
          orderBy: { name: "asc" },
        },
        orders: {
          include: {
            commercial: {
              select: { name: true },
            },
            branch: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        visits: {
          include: {
            commercial: {
              select: { name: true },
            },
            manager: {
              select: { name: true },
            },
          },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!client) {
      return new NextResponse("Not found", { status: 404 });
    }

    return NextResponse.json(client);
  }

  // Vrati sve klijente
  const clients = await prisma.client.findMany({
    include: {
      branches: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

// DODAJ PUT metodu za update klijenta
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  // Dozvoli COMMERCIAL i ADMIN da ažuriraju klijente
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
    note,
  } = body;

  if (!id) {
    return NextResponse.json(
      { error: "ID klijenta je obavezan." },
      { status: 400 }
    );
  }

  // Provjeri da li klijent postoji
  const existingClient = await prisma.client.findUnique({
    where: { id },
  });

  if (!existingClient) {
    return NextResponse.json(
      { error: "Klijent ne postoji." },
      { status: 404 }
    );
  }

  // Ažuriraj klijenta (ne mijenjaj erpId, matBroj, pdvBroj - to se sinkronizuje iz ERP)
  const updatedClient = await prisma.client.update({
    where: { id },
    data: {
      name: name ?? existingClient.name,
      address: address ?? existingClient.address,
      city: city ?? existingClient.city,
      phone: phone ?? existingClient.phone,
      email: email ?? existingClient.email,
      contactPerson: contactPerson ?? existingClient.contactPerson,
      note: note ?? existingClient.note,
    },
    include: {
      branches: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json(updatedClient);
}