import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: resourceId } = await params;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return Response.json({ error: "Date parameter is required." }, { status: 400 });
  }

  const selectedDate = new Date(dateParam);
  if (isNaN(selectedDate.getTime())) {
    return Response.json({ error: "Invalid date format." }, { status: 400 });
  }

  // Calculate start and end of the selected date (in UTC)
  const startOfDay = new Date(selectedDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Fetch all PENDING and CONFIRMED reservations for this resource on the selected date
  const reservations = await prisma.reservation.findMany({
    where: {
      resourceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
    },
    orderBy: { startTime: "asc" },
  });

  return Response.json(
    {
      reservations: reservations.map((r) => ({
        id: r.id,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime.toISOString(),
        status: r.status,
      })),
    },
    { status: 200 }
  );
}
