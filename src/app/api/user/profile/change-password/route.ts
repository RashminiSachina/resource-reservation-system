import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body;

  // Validation
  if (typeof currentPassword !== "string" || !currentPassword) {
    return Response.json({ error: "Current password is required." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (typeof confirmPassword !== "string" || !confirmPassword) {
    return Response.json({ error: "Please confirm your new password." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return Response.json({ error: "New passwords do not match." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return Response.json(
      { error: "New password must be different from current password." },
      { status: 400 }
    );
  }

  // Fetch user with password hash
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, passwordHash: true },
  });

  if (!userDetails) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  // Check if user has password-based authentication
  if (!userDetails.passwordHash) {
    return Response.json(
      { error: "Password-based authentication is not enabled for your account. You may be using OAuth." },
      { status: 400 }
    );
  }

  // Verify current password
  const passwordMatch = await bcrypt.compare(currentPassword, userDetails.passwordHash);
  if (!passwordMatch) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  return Response.json({ message: "Password changed successfully." }, { status: 200 });
}
