import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [totalUsers, totalResources, totalReservations, pendingReservations, confirmedReservations, cancelledReservations, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.resource.count({ where: { isActive: true } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: "PENDING" } }),
      prisma.reservation.count({ where: { status: "CONFIRMED" } }),
      prisma.reservation.count({ where: { status: "CANCELLED" } }),
      prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          purpose: true,
          status: true,
          startTime: true,
          endTime: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          resource: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);

  return Response.json(
    {
      stats: {
        totalUsers,
        totalResources,
        totalReservations,
        pendingReservations,
        confirmedReservations,
        cancelledReservations,
      },
      recentActivity,
    },
    { status: 200 }
  );
}
