import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendPushNotificationToUser } from "@/lib/push-notifications";
import { sendNewClientEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const commercialId = searchParams.get("commercialId");
  const clientId = searchParams.get("clientId");

  const where: any = {};
  if (from && to) {
    where.scheduledAt = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }
  if (clientId) where.clientId = clientId;

  // manager i admin vide sve (sa filterom), komercijalista vidi samo svoje
  if (["MANAGER", "ADMIN"].includes(user.role) && commercialId) {
    where.commercialId = commercialId;
  } else if (!["MANAGER", "ADMIN"].includes(user.role)) {
    where.commercialId = user.id;
  }

  const visits = await prisma.visit.findMany({
    where,
    include: {
      client: true,
      branches: {
        include: {
          branch: true,
        },
      },
      commercial: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Vraćamo i managerId direktno (već je u modelu)
  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const {
    clientId, // ako postoji, koristi postojećeg
    clientData, // ako ne postoji clientId, kreiraj novog klijenta
    branchIds, // array branchId-jeva - ako nije selektovan, prazan array = glavni klijent
    commercialId,
    scheduledAt,
    note,
  }: {
    clientId?: string;
    clientData?: {
      name: string;
      matBroj: string;
      pdvBroj?: string;
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
      contactPerson?: string;
      note?: string;
    };
    branchIds?: string[]; // array branchId-jeva
    commercialId?: string;
    scheduledAt: string;
    note?: string;
  } = body;

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt je obavezan" },
      { status: 400 }
    );
  }

  let finalClientId = clientId;

  // Ako nema clientId ali ima clientData, kreiraj klijenta
  if (!finalClientId && clientData?.name) {
    if (!clientData.matBroj || !clientData.matBroj.trim()) {
      return NextResponse.json(
        { error: "MAT_BROJ (ID broj kupca) je obavezan za novog klijenta." },
        { status: 400 }
      );
    }
    const newClient = await prisma.client.create({
      data: {
        name: clientData.name,
        matBroj: clientData.matBroj,
        pdvBroj: clientData.pdvBroj || null,
        address: clientData.address,
        city: clientData.city,
        phone: clientData.phone,
        email: clientData.email,
        contactPerson: clientData.contactPerson,
        note: clientData.note,
      },
    });
    finalClientId = newClient.id;

    // Pošalji email notifikaciju order managerima i adminima (ne blokira ako email fail-uje)
    try {
      // Pronađi komercijalistu koji kreira klijenta
      let commercialName = user.name;
      if (commercialId) {
        const commercial = await prisma.user.findUnique({
          where: { id: commercialId },
          select: { name: true },
        });
        if (commercial) {
          commercialName = commercial.name;
        }
      } else if (user.role === "COMMERCIAL") {
        commercialName = user.name;
      }
      
      await sendNewClientEmail(newClient, commercialName);
    } catch (emailError: any) {
      console.error("❌ Greška pri slanju emaila o novom klijentu:", emailError);
      // Ne blokiraj kreiranje posjete ako email fail-uje
    }
  }

  if (!finalClientId) {
    return NextResponse.json(
      { error: "clientId ili clientData.name su obavezni" },
      { status: 400 }
    );
  }

  let targetCommercialId = commercialId;
  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    targetCommercialId = user.id;
  }
  if (!targetCommercialId) {
    return NextResponse.json(
      { error: "commercialId je obavezan" },
      { status: 400 }
    );
  }

  const isManagerCreating = ["MANAGER", "ADMIN"].includes(user.role) && user.id !== targetCommercialId;

  // Normalizuj branchIds - ako nije array, pretvori u array ili prazan array
  const branchIdsArray = Array.isArray(branchIds) ? branchIds.filter(id => id && id.trim()) : [];

    const visit = await prisma.visit.create({
    data: {
      clientId: finalClientId,
      commercialId: targetCommercialId,
      managerId: ["MANAGER", "ADMIN"].includes(user.role) ? user.id : null,
      scheduledAt: new Date(scheduledAt),
      note: note ?? "",
      status: "PLANNED",
      branches: branchIdsArray.length > 0 ? {
        create: branchIdsArray.map(branchId => ({
          branchId: branchId,
        })),
      } : undefined,
    },
    include: { 
      client: true,
      branches: {
        include: {
          branch: true,
        },
      },
      commercial: true,
      manager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Pošalji push notifikaciju komercijalisti ako je manager kreirao posjetu
  if (isManagerCreating) {
    const scheduledDate = new Date(scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('bs-BA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Dodaj informacije o podružnicama ako postoje
    let branchInfo = '';
    if (visit.branches && visit.branches.length > 0) {
      const branchNames = visit.branches.map(vb => vb.branch.name).join(', ');
      branchInfo = `\nPodružnice: ${branchNames}`;
    }

    sendPushNotificationToUser(
      targetCommercialId,
      "Nova posjeta",
      `${visit.client.name} - ${formattedDate} u ${formattedTime}${branchInfo}${note ? `\n${note}` : ''}`,
      {
        tag: `visit-${visit.id}`,
        url: `/dashboard/commercial/visits`,
        data: {
          visitId: visit.id,
          type: 'visit',
        },
      }
    ).catch((err) => {
      console.error("Error sending push notification for visit:", err);
    });
  }

  await logAudit(req, user, {
    action: "CREATE_VISIT",
    entityType: "Visit",
    entityId: visit.id,
    metadata: {
      clientId: visit.clientId,
      commercialId: visit.commercialId,
      managerId: visit.managerId,
      scheduledAt: visit.scheduledAt,
      note: visit.note,
      branches: branchIdsArray,
    },
  });

  return NextResponse.json(visit, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const {
    id,
    status,
    note,
    scheduledAt,
  }: { 
    id: string; 
    status?: "PLANNED" | "DONE" | "CANCELED"; 
    note?: string;
    scheduledAt?: string;
  } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id je obavezan" },
      { status: 400 }
    );
  }

  const existing = await prisma.visit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Posjeta ne postoji" }, { status: 404 });
  }

  // Komercijalista može mijenjati samo svoje posjete
  if (
    user.role === "COMMERCIAL" &&
    existing.commercialId !== user.id
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const visit = await prisma.visit.update({
    where: { id },
    data: {
      status: status ?? existing.status,
      note: note ?? existing.note,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existing.scheduledAt,
    },
    include: { 
      client: true, 
      branches: {
        include: {
          branch: true,
        },
      },
      commercial: true 
    },
  });

  await logAudit(req, user, {
    action: "UPDATE_VISIT",
    entityType: "Visit",
    entityId: visit.id,
    metadata: {
      status: visit.status,
      note: visit.note,
      scheduledAt: visit.scheduledAt,
    },
  });

  return NextResponse.json(visit);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id je obavezan" }, { status: 400 });
  }

  await prisma.visit.delete({ where: { id } });

  await logAudit(req, user, {
    action: "DELETE_VISIT",
    entityType: "Visit",
    entityId: id,
  });

  return new NextResponse(null, { status: 204 });
}

