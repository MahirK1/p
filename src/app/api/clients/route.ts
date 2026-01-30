import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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

// POST - kreiraj novog klijenta
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  // Dozvoli samo ADMIN korisnicima da kreiraju klijente ručno
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    address,
    city,
    phone,
    email,
    contactPerson,
    note,
    matBroj,
    pdvBroj,
  } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Naziv klijenta je obavezan." },
      { status: 400 }
    );
  }

  try {
    const newClient = await prisma.client.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        city: city?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        note: note?.trim() || null,
        matBroj: matBroj?.trim() || null,
        pdvBroj: pdvBroj?.trim() || null,
      },
      include: {
        branches: {
          orderBy: { name: "asc" },
        },
      },
    });

    // Audit log
    await logAudit(req, user, {
      action: "CREATE_CLIENT",
      entityType: "Client",
      entityId: newClient.id,
      metadata: {
        name: newClient.name,
        address: newClient.address,
        city: newClient.city,
        phone: newClient.phone,
        email: newClient.email,
        contactPerson: newClient.contactPerson,
        note: newClient.note,
      },
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    
    // Provjeri da li je greška zbog unique constraint-a
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Klijent sa tim nazivom već postoji." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Greška pri kreiranju klijenta." },
      { status: 500 }
    );
  }
}

// PUT metoda za update klijenta
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  // Dozvoli COMMERCIAL, MANAGER i ADMIN da ažuriraju klijente
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

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_CLIENT",
        entityType: "Client",
        entityId: updatedClient.id,
        metadata: {
          before: {
            name: existingClient.name,
            address: existingClient.address,
            city: existingClient.city,
            phone: existingClient.phone,
            email: existingClient.email,
            contactPerson: existingClient.contactPerson,
            note: existingClient.note,
          },
          after: {
            name: updatedClient.name,
            address: updatedClient.address,
            city: updatedClient.city,
            phone: updatedClient.phone,
            email: updatedClient.email,
            contactPerson: updatedClient.contactPerson,
            note: updatedClient.note,
          },
        },
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log for client update", e);
  }

  return NextResponse.json(updatedClient);
}

// DELETE - obriši klijenta i njegove podružnice (podržava i bulk brisanje)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = session.user as any;
  // Dozvoli samo ADMIN korisnicima da brišu klijente
  if (user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const queryId = searchParams.get("id");

  // Provjeri da li je bulk delete (ima body sa ids array)
  let idsToDelete: string[] = [];
  
  // Pokušaj pročitati body (može biti bulk delete)
  try {
    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const body = await req.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
    }
  } catch {
    // Ako nema body ili nije JSON, ignoriraj
  }
  
  // Ako nema bulk delete, provjeri query parametar (single delete)
  if (idsToDelete.length === 0 && queryId) {
    idsToDelete = [queryId];
  }

  if (idsToDelete.length === 0) {
    return NextResponse.json(
      { error: "ID klijenta ili lista ID-jeva je obavezna." },
      { status: 400 }
    );
  }

  // Učitaj sve klijente sa vezama
  const clients = await prisma.client.findMany({
    where: { id: { in: idsToDelete } },
    include: {
      branches: {
        select: { id: true },
      },
      orders: {
        select: { id: true },
        take: 1,
      },
      visits: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (clients.length === 0) {
    return NextResponse.json(
      { error: "Nijedan od klijenata ne postoji." },
      { status: 404 }
    );
  }

  // Provjeri da li neki klijent ima narudžbe ili posjete
  const clientsWithOrdersOrVisits = clients.filter(
    (c) => c.orders.length > 0 || c.visits.length > 0
  );

  if (clientsWithOrdersOrVisits.length > 0) {
    const names = clientsWithOrdersOrVisits.map((c) => c.name).join(", ");
    return NextResponse.json(
      {
        error:
          `Sljedeći klijenti imaju povezane narudžbe ili posjete i ne mogu biti obrisani: ${names}. ` +
          "Prvo arhiviraj/obradi te podatke.",
      },
      { status: 400 }
    );
  }

  // Prikupi sve branch ID-jeve
  const allBranchIds = clients.flatMap((c) => c.branches.map((b) => b.id));

  let deletedCount = 0;

  await prisma.$transaction(async (tx) => {
    if (allBranchIds.length > 0) {
      // Prvo ukloni referencu na branch iz narudžbi (ako je nekad postojala)
      await tx.order.updateMany({
        where: {
          branchId: { in: allBranchIds },
        },
        data: {
          branchId: null,
        },
      });

      // Obriši podružnice
      await tx.clientBranch.deleteMany({
        where: { id: { in: allBranchIds } },
      });
    }

    // Na kraju obriši klijente
    const result = await tx.client.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    
    deletedCount = result.count;
  });

  return NextResponse.json({ success: true, deleted: deletedCount });
}