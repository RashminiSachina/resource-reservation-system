import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateOtp, hashValue } from "@/lib/crypto";
import { sendPasswordResetOtpEmail } from "@/lib/mail";
import {
  checkForgotPasswordRateLimit,
  recordForgotPasswordRequest,
} from "@/lib/rate-limiter";

interface ForgotPasswordBody {
  email?: unknown;
}

const GENERIC_RESPONSE = {
  message:
    "If an account is associated with this email, a 6-digit verification code has been sent.",
};

export async function POST(request: NextRequest) {
  let body: ForgotPasswordBody;

  try {
    body = (await request.json()) as ForgotPasswordBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email } = body;

  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return Response.json({ error: "Invalid email address." }, { status: 400 });
  }

  // --- Server-side Rate Limiting & Cooldown ---
  const rateLimit = checkForgotPasswordRateLimit(normalizedEmail);
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "COOLDOWN") {
      return Response.json(
        {
          error: `Please wait ${rateLimit.retryAfterSeconds} seconds before requesting another code.`,
        },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "Too many password reset requests. Please try again later." },
      { status: 429 }
    );
  }

  // --- User Lookup ---
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      passwordHash: true,
    },
  });

  // Anti-enumeration: return generic success if user does not exist,
  // is deactivated, or was created via OAuth (passwordHash is null).
  if (!user || !user.isActive || !user.passwordHash) {
    // Record request to prevent timing side-channels
    recordForgotPasswordRequest(normalizedEmail);
    return Response.json(GENERIC_RESPONSE, { status: 200 });
  }

  // --- Generate 6-digit OTP & Expiration (10 minutes) ---
  const otp = generateOtp();
  const otpHash = hashValue(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate any previous active OTP/reset tokens for this user,
  // and create the tentative new token record inside a transaction.
  let tokenRecordId: string;
  try {
    const [, created] = await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
          attempts: 0,
          maxAttempts: 5,
        },
      }),
    ]);
    tokenRecordId = created.id;
  } catch {
    return Response.json(
      { error: "Unable to process request at this time. Please try again later." },
      { status: 500 }
    );
  }

  // --- Send Email via Nodemailer ---
  let deliverySuccess = false;
  try {
    deliverySuccess = await sendPasswordResetOtpEmail(user.email, otp, user.name);
  } catch {
    deliverySuccess = false;
  }

  // If email delivery failed, immediately delete the tentative token record
  // so no dangling, unusable reset token exists.
  if (!deliverySuccess) {
    await prisma.passwordResetToken.delete({
      where: { id: tokenRecordId },
    }).catch(() => {});
  }

  // Record rate limit timestamp only after processing
  recordForgotPasswordRequest(normalizedEmail);

  // Uniform generic response regardless of whether user exists or email was dispatched
  return Response.json(GENERIC_RESPONSE, { status: 200 });
}
