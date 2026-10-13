import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await requireUserSession();

  // Mark all unread notifications for the current user as read
  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return Response.json(
    {
      message: "All notifications marked as read.",
      count: result.count,
    },
    { status: 200 }
  );
}
