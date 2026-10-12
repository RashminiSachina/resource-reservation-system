import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";

/** Minimum booking lead time: 1 minute from now */
const MIN_LEAD_MS = 60 * 1000;

/** Maximum retry attempts for Serializable transaction conflicts (P2034) */
const MAX_TX_RETRIES = 3;

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
    return Response.json({ error: "Invalid date/time format." }, { status: 400 });
  }
  if (end <= start) {
    return Response.json({ error: "End time must be after start time." }, { status: 400 });
  }
  if (start.getTime() - Date.now() < MIN_LEAD_MS) {
    return Response.json(
      { error: "Start time must be at least 1 minute in the future." },
      { status: 400 }
    );
  }

  // Verify resource exists and is active (outside transaction — fast pre-check)
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId.trim() },
    select: { id: true, isActive: true, name: true },
  });
  if (!resource || !resource.isActive) {
    return Response.json({ error: "Resource not found or unavailable." }, { status: 404 });
  }

  // Serializable transaction with bounded retry for P2034 conflicts
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt++) {
    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          // Re-verify resource is still active inside the transaction
          const activeResource = await tx.resource.findUnique({
            where: { id: resource.id },
            select: { id: true, isActive: true },
          });
          if (!activeResource || !activeResource.isActive) {
            throw Object.assign(new Error("Resource is no longer available."), { code: "RESOURCE_INACTIVE" });
          }

          // Check for any overlapping PENDING or CONFIRMED reservations
          // Overlap: existing.startTime < end  AND  existing.endTime > start
          const conflict = await tx.reservation.findFirst({
            where: {
              resourceId: resource.id,
              status: { in: ["PENDING", "CONFIRMED"] },
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true, startTime: true, endTime: true },
          });

          if (conflict) {
            const cs = new Date(conflict.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const ce = new Date(conflict.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            throw Object.assign(
              new Error(`This resource is already booked from ${cs} to ${ce}. Please choose another time or resource.`),
              { code: "BOOKING_CONFLICT" }
            );
          }

          return tx.reservation.create({
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
              resource: { select: { id: true, name: true, location: true, category: { select: { name: true } } } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return Response.json({ message: "Reservation submitted.", reservation }, { status: 201 });
    } catch (err) {
      // P2034 = Transaction failed due to serialization conflict; retry
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034"
      ) {
        lastError = err;
        continue;
      }
      // Domain errors thrown inside the transaction
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "BOOKING_CONFLICT") {
        return Response.json(
          { error: err.message },
          { status: 409 }
        );
      }
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "RESOURCE_INACTIVE") {
        return Response.json({ error: err.message }, { status: 409 });
      }
      // Unexpected errors
      return Response.json({ error: "Failed to create reservation. Please try again." }, { status: 500 });
    }
  }

  // All retry attempts exhausted (P2034 persisted)
  void lastError;
  return Response.json(
    { error: "The system is busy. Please try again in a moment." },
    { status: 503 }
  );
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
  // Allow cancellation of PENDING and CONFIRMED reservations by the owning user
  if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
    return Response.json(
      { error: "This reservation cannot be cancelled." },
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
