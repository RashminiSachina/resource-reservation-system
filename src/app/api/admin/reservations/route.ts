import { NextRequest } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import {
  BookingDomainError,
  approvalConflictError,
  findOccupiedOverlap,
} from "@/lib/reservation-conflicts";
import { createNotification, formatReservationTime } from "@/lib/notifications";

const MAX_TX_RETRIES = 3;

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

  const nextStatus = status as ReservationStatus;

  if (nextStatus !== "CONFIRMED") {
    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId.trim() },
      select: { id: true, status: true, userId: true, resource: { select: { name: true } } },
    });

    if (!existing) {
      return Response.json({ error: "Reservation not found." }, { status: 404 });
    }

    const updated = await prisma.reservation.update({
      where: { id: existing.id },
      data: { status: nextStatus },
      select: { id: true, status: true, user: { select: { id: true, name: true } }, resource: { select: { name: true } } },
    });

    // If admin cancelled a reservation, notify the owner
    if (nextStatus === "CANCELLED" && existing.status !== "CANCELLED") {
      try {
        await createNotification({
          userId: existing.userId,
          title: "Reservation Cancelled",
          message: `Your reservation for ${existing.resource.name} has been cancelled by an administrator.`,
          type: "RESERVATION_CANCELLED",
        });
      } catch (notificationError) {
        console.error("[Notification] Failed to create cancellation notification:", notificationError);
      }
    }

    return Response.json({ message: "Reservation updated.", reservation: updated }, { status: 200 });
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt++) {
    try {
      const updated = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.reservation.findUnique({
            where: { id: reservationId.trim() },
            select: {
              id: true,
              status: true,
              userId: true,
              resourceId: true,
              startTime: true,
              endTime: true,
              resource: { select: { isActive: true, name: true } },
            },
          });

          if (!existing) {
            throw new BookingDomainError("NOT_FOUND", "Reservation not found.");
          }

          if (existing.status === "CONFIRMED") {
            return tx.reservation.findUniqueOrThrow({
              where: { id: existing.id },
              select: {
                id: true,
                status: true,
                user: { select: { id: true, name: true } },
                resource: { select: { name: true } },
              },
            });
          }

          if (!existing.resource.isActive) {
            throw new BookingDomainError(
              "RESOURCE_INACTIVE",
              "This resource is no longer available and cannot be approved."
            );
          }

          const conflict = await findOccupiedOverlap(tx, {
            resourceId: existing.resourceId,
            start: existing.startTime,
            end: existing.endTime,
            excludeId: existing.id,
            statuses: ["CONFIRMED"],
          });

          if (conflict) {
            throw approvalConflictError(conflict);
          }

          return tx.reservation.update({
            where: { id: existing.id },
            data: { status: "CONFIRMED" },
            select: {
              id: true,
              status: true,
              userId: true,
              startTime: true,
              endTime: true,
              user: { select: { id: true, name: true } },
              resource: { select: { name: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      // Notify the reservation owner about approval (outside transaction)
      // Only notify if status actually changed from PENDING to CONFIRMED
      // We need to re-fetch the reservation to get the start/end times since they're not in the transaction return
      const reservationForNotification = await prisma.reservation.findUnique({
        where: { id: updated.id },
        select: {
          userId: true,
          startTime: true,
          endTime: true,
          resource: { select: { name: true } },
        },
      });

      if (reservationForNotification) {
        try {
          const timeString = formatReservationTime(reservationForNotification.startTime, reservationForNotification.endTime);
          await createNotification({
            userId: reservationForNotification.userId,
            title: "Reservation Approved",
            message: `Your reservation for ${reservationForNotification.resource.name} on ${timeString} has been approved.`,
            type: "RESERVATION_CONFIRMED",
          });
        } catch (notificationError) {
          console.error("[Notification] Failed to create approval notification:", notificationError);
        }
      }

      return Response.json({ message: "Reservation approved.", reservation: updated }, { status: 200 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034"
      ) {
        lastError = err;
        continue;
      }
      if (err instanceof BookingDomainError && err.code === "NOT_FOUND") {
        return Response.json({ error: err.message }, { status: 404 });
      }
      if (
        err instanceof BookingDomainError &&
        (err.code === "SLOT_UNAVAILABLE" || err.code === "RESOURCE_INACTIVE")
      ) {
        return Response.json({ error: err.message }, { status: 409 });
      }
      return Response.json({ error: "Failed to update reservation. Please try again." }, { status: 500 });
    }
  }

  void lastError;
  return Response.json(
    { error: "The system is busy. Please try again in a moment." },
    { status: 503 }
  );
}
