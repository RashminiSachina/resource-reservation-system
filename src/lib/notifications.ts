import prisma from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";

/**
 * Create a notification for a specific user
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
    },
  });
}

/**
 * Create notifications for multiple users (e.g., all active regular users)
 */
export async function createBulkNotifications(params: {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
}) {
  if (params.userIds.length === 0) {
    return [];
  }

  return prisma.notification.createMany({
    data: params.userIds.map((userId) => ({
      userId,
      title: params.title,
      message: params.message,
      type: params.type,
    })),
  });
}

/**
 * Get all active regular user IDs (not admins)
 */
export async function getActiveRegularUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      isActive: true,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

/**
 * Get all active admin user IDs
 */
export async function getActiveAdminUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      isActive: true,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

/**
 * Format reservation date/time for notifications
 */
export function formatReservationTime(startTime: Date, endTime: Date): string {
  const date = new Date(startTime).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = new Date(startTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Date(endTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} from ${start} to ${end}`;
}
