import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendPushNotificationToUser } from "@/lib/push-notifications";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const commercialId = searchParams.get("commercialId");

  const where: any = {};

  // Admin i manager vide sve, komercijalista vidi samo svoje
  if (["ADMIN", "MANAGER", "DIRECTOR"].includes(user.role)) {
    if (commercialId) {
      where.commercialId = commercialId;
    }
  } else {
    // Komercijalista vidi samo svoje posjete doktora
    where.commercialId = user.id;
  }

  if (from && to) {
    where.scheduledAt = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }

  const doctorVisits = await prisma.doctorVisit.findMany({
    where,
    include: {
      commercial: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json(doctorVisits);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  // Provjeri da li komercijalista ima dozvolu za pristup
  if (user.role === "COMMERCIAL") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { canAccessDoctorVisits: true },
    });
    if (!dbUser?.canAccessDoctorVisits) {
      return new NextResponse("Forbidden - Nemaš dozvolu za pristup posjetama doktora", { status: 403 });
    }
  }

  if (!["COMMERCIAL", "ADMIN", "MANAGER", "DIRECTOR"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    institution,
    contactNumber,
    email,
    scheduledAt,
    note,
    commercialId,
  } = body;

  if (!firstName || !lastName || !institution || !scheduledAt) {
    return NextResponse.json(
      { error: "Ime, prezime, ustanova i datum su obavezni." },
      { status: 400 }
    );
  }

  // Ako je komercijalista, koristi njegov ID
  const finalCommercialId = user.role === "COMMERCIAL" ? user.id : (commercialId || user.id);

  const doctorVisit = await prisma.doctorVisit.create({
    data: {
      commercialId: finalCommercialId,
      firstName,
      lastName,
      institution,
      contactNumber: contactNumber || null,
      email: email || null,
      scheduledAt: new Date(scheduledAt),
      note: note || null,
    },
    include: {
      commercial: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await logAudit(req, user, {
    action: "CREATE_DOCTOR_VISIT",
    entityType: "DoctorVisit",
    entityId: doctorVisit.id,
    metadata: {
      firstName,
      lastName,
      institution,
      scheduledAt,
    },
  });

  return NextResponse.json(doctorVisit, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const { id, firstName, lastName, institution, contactNumber, email, scheduledAt, note, managerComment } = body;

  if (!id) {
    return NextResponse.json({ error: "ID je obavezan." }, { status: 400 });
  }

  const existingVisit = await prisma.doctorVisit.findUnique({
    where: { id },
  });

  if (!existingVisit) {
    return NextResponse.json({ error: "Posjeta ne postoji." }, { status: 404 });
  }

  if (user.role === "COMMERCIAL" && existingVisit.commercialId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const canSetManagerComment = ["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role);
  const effectiveManagerComment = canSetManagerComment
    ? (managerComment !== undefined ? managerComment : existingVisit.managerComment ?? null)
    : existingVisit.managerComment;

  const doctorVisit = await prisma.doctorVisit.update({
    where: { id },
    data: {
      firstName: firstName || existingVisit.firstName,
      lastName: lastName || existingVisit.lastName,
      institution: institution || existingVisit.institution,
      contactNumber: contactNumber !== undefined ? contactNumber : existingVisit.contactNumber,
      email: email !== undefined ? email : existingVisit.email,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existingVisit.scheduledAt,
      note: note !== undefined ? note : existingVisit.note,
      managerComment: effectiveManagerComment,
    },
    include: {
      commercial: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (canSetManagerComment && effectiveManagerComment && String(effectiveManagerComment).trim() && doctorVisit.commercialId) {
    const dateStr = doctorVisit.scheduledAt ? new Date(doctorVisit.scheduledAt).toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    await sendPushNotificationToUser(
      doctorVisit.commercialId,
      "Komentar na posjeti doktora",
      `Manager vam je ostavio komentar na posjeti doktora (${dateStr}).`,
      { url: "/dashboard/commercial/doctor-visits" }
    );
  }

  await logAudit(req, user, {
    action: "UPDATE_DOCTOR_VISIT",
    entityType: "DoctorVisit",
    entityId: doctorVisit.id,
    metadata: {
      firstName: doctorVisit.firstName,
      lastName: doctorVisit.lastName,
      institution: doctorVisit.institution,
    },
  });

  return NextResponse.json(doctorVisit);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID je obavezan." }, { status: 400 });
  }

  const existingVisit = await prisma.doctorVisit.findUnique({
    where: { id },
  });

  if (!existingVisit) {
    return NextResponse.json({ error: "Posjeta ne postoji." }, { status: 404 });
  }

  // Komercijalista može brisati samo svoje posjete
  if (user.role === "COMMERCIAL" && existingVisit.commercialId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!["ADMIN", "MANAGER", "DIRECTOR"].includes(user.role) && existingVisit.commercialId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await prisma.doctorVisit.delete({
    where: { id },
  });

  await logAudit(req, user, {
    action: "DELETE_DOCTOR_VISIT",
    entityType: "DoctorVisit",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}

