import { NextRequest } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const validStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];

  const where: Prisma.ReservationWhereInput = {
    ...(status && validStatuses.includes(status as ReservationStatus)
      ? { status: status as ReservationStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { requesterName: { contains: search, mode: "insensitive" } },
            { requesterEmail: { contains: search, mode: "insensitive" } },
            { purpose: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        purpose: true,
        requesterName: true,
        requesterEmail: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        resource: { select: { id: true, name: true, location: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return Response.json({ reservations, total, page, limit }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { reservationId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { reservationId, status } = body;

  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return Response.json({ error: "Reservation ID is required." }, { status: 400 });
  }

  const allowedStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (typeof status !== "string" || !allowedStatuses.includes(status)) {
    return Response.json(
      { error: `Status must be one of: ${allowedStatuses.join(", ")}.` },
      { status: 400 }
    );
  }

  const existing = await prisma.reservation.findUnique({
    where: { id: reservationId.trim() },
    select: { id: true, status: true },
  });

  if (!existing) {
    return Response.json({ error: "Reservation not found." }, { status: 404 });
  }

  const updated = await prisma.reservation.update({
    where: { id: existing.id },
    data: { status: status as "PENDING" | "CONFIRMED" | "CANCELLED" },
    select: { id: true, status: true, user: { select: { id: true, name: true } }, resource: { select: { name: true } } },
  });

  return Response.json({ message: "Reservation updated.", reservation: updated }, { status: 200 });
}
