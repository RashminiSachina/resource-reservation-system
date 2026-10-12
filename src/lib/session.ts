import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "reserveit_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// --- Secret Resolution ---
// SESSION_SECRET MUST be set in production. A predictable fallback is never used in production.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Session] SESSION_SECRET environment variable is required in production. Set it to a cryptographically random 32+ character string."
      );
    }
    // Development-only fallback — not cryptographically ideal but explicit and non-predictable at deploy
    console.warn(
      "[Session] SESSION_SECRET not set. Using development fallback. Set SESSION_SECRET in production."
    );
    return "dev-only-session-secret-not-for-production-use";
  }

  return secret;
}

// --- Session Payload ---
export interface SessionPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  expiresAt: number; // Unix epoch ms
}

// --- Token Signing & Verification ---
function hmacSign(data: string): string {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmacSign(data);
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expectedSig = hmacSign(data);

    // Constant-time comparison to prevent timing attacks
    const aBuf = Buffer.from(sig, "utf-8");
    const bBuf = Buffer.from(expectedSig, "utf-8");
    if (aBuf.length !== bBuf.length) return null;
    if (!crypto.timingSafeEqual(aBuf, bBuf)) return null;

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as SessionPayload;
    if (typeof payload.userId !== "string") return null;
    if (typeof payload.expiresAt !== "number") return null;
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}

// --- Cookie Management ---
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

// --- Session Read ---
export async function getSessionPayload(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

// --- Live DB User Fetch ---
// IMPORTANT: Always fetches from DB for authorization-sensitive operations.
// Never trust the role in the cookie alone.
export async function getAuthenticatedUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
}

// --- Authorization Helpers ---
export async function requireUserSession(): Promise<
  { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: Date }
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthError(401, "Authentication required.");
  }
  return user;
}

export async function requireAdminSession(): Promise<
  { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: Date }
> {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthError(401, "Authentication required.");
  if (user.role !== "ADMIN") throw new AuthError(403, "Administrators only.");
  return user;
}

// --- Auth Error class for route handlers ---
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}
