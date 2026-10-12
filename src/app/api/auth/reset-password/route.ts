import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { hashValue } from "@/lib/crypto";

interface ResetPasswordBody {
  email?: unknown;
  resetToken?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  let body: ResetPasswordBody;

  try {
    body = (await request.json()) as ResetPasswordBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, resetToken, password } = body;

  // --- Input Validation ---
  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }

  if (typeof resetToken !== "string" || !resetToken.trim()) {
    return Response.json(
      { error: "Reset authorization token is required." },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = resetToken.trim();
  const tokenHash = hashValue(trimmedToken);

  // --- Atomic Verification, Token Consumption, and Password Update ---
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Find user
      const user = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new Error("INVALID_SESSION");
      }

      // 2. Find and verify the unexpired reset authorization record
      const tokenRecord = await tx.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          tokenHash,
          tokenExpiresAt: { gt: new Date() },
        },
      });

      if (!tokenRecord) {
        throw new Error("INVALID_SESSION");
      }

      // 3. Atomically consume (delete) the token to prevent replay
      await tx.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });

      // 4. Hash new password with bcryptjs (cost factor 12)
      const passwordHash = await bcrypt.hash(password, 12);

      // 5. Update user password
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    });

    return Response.json(
      {
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "";
    if (errorMsg === "INVALID_SESSION") {
      return Response.json(
        {
          error:
            "Invalid or expired reset session. Please request a new verification code.",
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unable to reset password. Please try again later." },
      { status: 500 }
    );
  }
}
