import crypto from "crypto";

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 */
export function generateOtp(): string {
  // Generates integer in range [100000, 999999] inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a SHA-256 hex digest of the given string.
 * Used for zero-knowledge storage of OTPs and reset tokens.
 */
export function hashValue(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

/**
 * Generates a cryptographically secure random token (hex string).
 * Used for the short-lived reset authorization token.
 */
export function generateResetToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Performs a constant-time comparison of two strings.
 * Pre-checks buffer lengths before invoking crypto.timingSafeEqual
 * to prevent RangeError when buffer lengths differ.
 */
export function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
