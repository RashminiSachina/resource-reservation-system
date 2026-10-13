import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await requireUserSession();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return Response.json({ unreadCount }, { status: 200 });
}
