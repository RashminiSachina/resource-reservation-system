import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("startTime");
  const endParam = searchParams.get("endTime");
  const categoryIdParam = searchParams.get("categoryId");

  // Parse and validate optional time window
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;
  if (startParam && endParam) {
    const s = new Date(startParam);
    const e = new Date(endParam);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
      windowStart = s;
      windowEnd = e;
    }
  }

  const resources = await prisma.resource.findMany({
    where: {
      isActive: true,
      // Filter by category when provided
      ...(categoryIdParam ? { categoryId: categoryIdParam } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      capacity: true,
      category: { select: { id: true, name: true } },
      // Only fetch overlapping active reservations if time window is provided
      ...(windowStart && windowEnd
        ? {
            reservations: {
              where: {
                status: { in: ["PENDING", "CONFIRMED"] },
                startTime: { lt: windowEnd },
                endTime: { gt: windowStart },
              },
              select: { id: true, startTime: true, endTime: true },
              take: 1, // Only need to know if at least one conflict exists
            },
          }
        : {}),
    },
  });

  const result = resources.map((r) => {
    const { reservations, ...rest } = r as typeof r & {
      reservations?: Array<{ id: string; startTime: Date; endTime: Date }>;
    };

    let availability: "available" | "booked" | "unknown" = "unknown";
    let conflictStart: string | null = null;
    let conflictEnd: string | null = null;

    if (windowStart && windowEnd) {
      if (reservations && reservations.length > 0) {
        availability = "booked";
        conflictStart = reservations[0].startTime.toISOString();
        conflictEnd = reservations[0].endTime.toISOString();
      } else {
        availability = "available";
      }
    }

    return { ...rest, availability, conflictStart, conflictEnd };
  });

  return Response.json({ resources: result }, { status: 200 });
}
