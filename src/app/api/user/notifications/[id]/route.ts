import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: notificationId } = await context.params;

  // Verify ownership - user can only mark their own notifications as read
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true },
  });

  if (!notification) {
    return Response.json({ error: "Notification not found." }, { status: 404 });
  }

  if (notification.userId !== user.id) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  if (notification.readAt !== null) {
    // Already read - return success without updating
    return Response.json({ message: "Notification already read." }, { status: 200 });
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  return Response.json({ message: "Notification marked as read.", notification: updated }, { status: 200 });
}
