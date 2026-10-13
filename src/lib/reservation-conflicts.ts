import { Prisma, ReservationStatus } from "@/generated/prisma/client";

export const OCCUPIED_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED"];

export class BookingDomainError extends Error {
  constructor(
    public readonly code: "BOOKING_CONFLICT" | "RESOURCE_INACTIVE" | "SLOT_UNAVAILABLE" | "NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "BookingDomainError";
  }
}

export function formatSlotTimes(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return {
    start: new Date(start).toLocaleTimeString([], opts),
    end: new Date(end).toLocaleTimeString([], opts),
  };
}

export async function findOccupiedOverlap(
  tx: Prisma.TransactionClient,
  params: {
    resourceId: string;
    start: Date;
    end: Date;
    excludeId?: string;
    statuses?: ReservationStatus[];
  }
) {
  return tx.reservation.findFirst({
    where: {
      resourceId: params.resourceId,
      status: { in: params.statuses ?? OCCUPIED_STATUSES },
      startTime: { lt: params.end },
      endTime: { gt: params.start },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true, status: true },
  });
}

export function conflictError(conflict: { startTime: Date; endTime: Date }) {
  const { start, end } = formatSlotTimes(conflict.startTime, conflict.endTime);
  return new BookingDomainError(
    "BOOKING_CONFLICT",
    `This resource is already booked from ${start} to ${end}. Please choose another time or resource.`
  );
}

export function approvalConflictError(conflict: { startTime: Date; endTime: Date }) {
  const { start, end } = formatSlotTimes(conflict.startTime, conflict.endTime);
  return new BookingDomainError(
    "SLOT_UNAVAILABLE",
    `This time slot is no longer available. It is already booked from ${start} to ${end}.`
  );
}
