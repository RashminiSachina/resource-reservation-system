import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashValue, generateResetToken, timingSafeMatch } from "@/lib/crypto";
import {
  checkVerifyOtpRateLimit,
  recordVerifyOtpAttempt,
} from "@/lib/rate-limiter";

interface VerifyOtpBody {
  email?: unknown;
  otp?: unknown;
}

export async function POST(request: NextRequest) {
  let body: VerifyOtpBody;

  try {
    body = (await request.json()) as VerifyOtpBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, otp } = body;

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // --- IP Rate Limit Check ---
  const ipCheck = checkVerifyOtpRateLimit(clientIp);
  if (!ipCheck.allowed) {
    return Response.json(
      {
        error: `Too many verification attempts. Please wait ${ipCheck.retryAfterSeconds} seconds before trying again.`,
      },
      { status: 429 }
    );
  }

  // --- Input Validation ---
  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
    return Response.json(
      { error: "Verification code must be exactly 6 digits." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  // --- User & Token Lookup ---
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      isActive: true,
      passwordResetTokens: {
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive || user.passwordResetTokens.length === 0) {
    recordVerifyOtpAttempt(clientIp);
    return Response.json(
      { error: "Invalid or expired verification code." },
      { status: 400 }
    );
  }

  const tokenRecord = user.passwordResetTokens[0];

  // Check if attempts already exhausted
  if (tokenRecord.attempts >= tokenRecord.maxAttempts) {
    recordVerifyOtpAttempt(clientIp);
    await prisma.passwordResetToken.delete({
      where: { id: tokenRecord.id },
    }).catch(() => {});
    return Response.json(
      { error: "Maximum attempts exceeded. Please request a new verification code." },
      { status: 400 }
    );
  }

  // --- Constant-Time Timing-Safe Comparison ---
  const inputHash = hashValue(trimmedOtp);
  const isMatch = timingSafeMatch(inputHash, tokenRecord.otpHash);

  if (!isMatch) {
    recordVerifyOtpAttempt(clientIp);
    const newAttempts = tokenRecord.attempts + 1;

    if (newAttempts >= tokenRecord.maxAttempts) {
      // Invalidate token immediately upon reaching max attempts
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      }).catch(() => {});

      return Response.json(
        { error: "Maximum attempts exceeded. Please request a new verification code." },
        { status: 400 }
      );
    }

    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { attempts: newAttempts },
    });

    const remaining = tokenRecord.maxAttempts - newAttempts;
    return Response.json(
      {
        error: `Invalid verification code. ${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining.`,
      },
      { status: 400 }
    );
  }

  // --- Issue Single-Use Reset Authorization Token ---
  // The client receives the raw reset token; the database stores only its SHA-256 hash.
  const resetToken = generateResetToken(32);
  const tokenHash = hashValue(resetToken);
  const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: {
      tokenHash,
      tokenExpiresAt,
      // Invalidate the OTP part so it cannot be re-verified
      expiresAt: new Date(0),
    },
  });

  return Response.json(
    {
      message: "Verification successful.",
      resetToken,
    },
    { status: 200 }
  );
}
