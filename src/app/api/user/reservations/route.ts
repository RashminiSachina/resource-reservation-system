import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const validStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];

  const where: Prisma.ReservationWhereInput = {
    userId: user.id, // Ownership enforced — user can only see their own reservations
    ...(status && validStatuses.includes(status as ReservationStatus)
      ? { status: status as ReservationStatus }
      : {}),
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        purpose: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        resource: {
          select: {
            id: true,
            name: true,
            location: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return Response.json({ reservations, total, page, limit }, { status: 200 });
}

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    resourceId?: unknown;
    purpose?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resourceId, purpose, startTime, endTime } = body;

  if (typeof resourceId !== "string" || !resourceId.trim()) {
    return Response.json({ error: "Resource is required." }, { status: 400 });
  }
  if (typeof purpose !== "string" || !purpose.trim()) {
    return Response.json({ error: "Purpose is required." }, { status: 400 });
  }
  if (typeof startTime !== "string" || !startTime) {
    return Response.json({ error: "Start time is required." }, { status: 400 });
  }
  if (typeof endTime !== "string" || !endTime) {
    return Response.json({ error: "End time is required." }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: "Invalid date format." }, { status: 400 });
  }
  if (end <= start) {
    return Response.json({ error: "End time must be after start time." }, { status: 400 });
  }
  if (start < new Date()) {
    return Response.json({ error: "Start time must be in the future." }, { status: 400 });
  }

  // Verify resource exists and is active
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId.trim() },
    select: { id: true, isActive: true },
  });
  if (!resource || !resource.isActive) {
    return Response.json({ error: "Resource not found or unavailable." }, { status: 404 });
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
      resourceId: resource.id,
      requesterName: user.name,
      requesterEmail: user.email,
      purpose: purpose.trim(),
      startTime: start,
      endTime: end,
      status: "PENDING",
    },
    select: {
      id: true,
      purpose: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      resource: { select: { id: true, name: true, location: true } },
    },
  });

  return Response.json({ message: "Reservation submitted.", reservation }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { reservationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { reservationId } = body;
  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return Response.json({ error: "Reservation ID is required." }, { status: 400 });
  }

  // Ownership enforced — user can only cancel their own reservation
  const existing = await prisma.reservation.findFirst({
    where: { id: reservationId.trim(), userId: user.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return Response.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (existing.status === "CANCELLED") {
    return Response.json({ error: "Reservation is already cancelled." }, { status: 400 });
  }
  if (existing.status === "CONFIRMED") {
    return Response.json(
      { error: "Confirmed reservations cannot be cancelled by users." },
      { status: 400 }
    );
  }

  const updated = await prisma.reservation.update({
    where: { id: existing.id },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });

  return Response.json({ message: "Reservation cancelled.", reservation: updated }, { status: 200 });
}
