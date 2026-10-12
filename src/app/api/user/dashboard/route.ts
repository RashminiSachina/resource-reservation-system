import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET() {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [total, pending, confirmed, cancelled, recent] = await Promise.all([
    prisma.reservation.count({ where: { userId: user.id } }),
    prisma.reservation.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.reservation.count({ where: { userId: user.id, status: "CONFIRMED" } }),
    prisma.reservation.count({ where: { userId: user.id, status: "CANCELLED" } }),
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
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
  ]);

  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: { total, pending, confirmed, cancelled },
      recentReservations: recent,
    },
    { status: 200 }
  );
}
