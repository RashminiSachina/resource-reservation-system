interface EmailRateRecord {
  timestamps: number[];
  lastRequestTime: number;
}

interface IpRateRecord {
  timestamps: number[];
}

// Global in-memory storage across hot reloads in development
const globalStore = globalThis as unknown as {
  __forgotPasswordEmailStore?: Map<string, EmailRateRecord>;
  __verifyOtpIpStore?: Map<string, IpRateRecord>;
};

const emailStore = (globalStore.__forgotPasswordEmailStore ??= new Map());
const ipStore = (globalStore.__verifyOtpIpStore ??= new Map());

// Limits & Windows
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum between requests
const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FORGOT_PASSWORD_MAX_REQUESTS = 3; // Max 3 requests per 15 min per email

const VERIFY_OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const VERIFY_OTP_MAX_REQUESTS = 10; // Max 10 verification attempts per IP per 10 min

/**
 * Checks if a forgot-password / OTP resend request is permitted for the given email.
 */
export function checkForgotPasswordRateLimit(email: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: "COOLDOWN" | "MAX_REQUESTS";
} {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  const record = emailStore.get(normalized);

  if (!record) {
    return { allowed: true };
  }

  // 1. Check strict 60-second cooldown
  const timeSinceLast = now - record.lastRequestTime;
  if (timeSinceLast < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
      reason: "COOLDOWN",
    };
  }

  // 2. Check 15-minute sliding window max requests
  const recent = record.timestamps.filter((t: number) => now - t < FORGOT_PASSWORD_WINDOW_MS);
  if (recent.length >= FORGOT_PASSWORD_MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((FORGOT_PASSWORD_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
      reason: "MAX_REQUESTS",
    };
  }

  return { allowed: true };
}

/**
 * Records a successful forgot-password request.
 */
export function recordForgotPasswordRequest(email: string): void {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  const record = emailStore.get(normalized);

  if (!record) {
    emailStore.set(normalized, {
      timestamps: [now],
      lastRequestTime: now,
    });
  } else {
    const recent = record.timestamps.filter((t: number) => now - t < FORGOT_PASSWORD_WINDOW_MS);
    recent.push(now);
    record.timestamps = recent;
    record.lastRequestTime = now;
  }
}

/**
 * Checks if an OTP verification request from a given IP is permitted.
 */
export function checkVerifyOtpRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const key = ip || "unknown_ip";
  const now = Date.now();
  const record = ipStore.get(key);

  if (!record) {
    return { allowed: true };
  }

  const recent = record.timestamps.filter((t: number) => now - t < VERIFY_OTP_WINDOW_MS);
  if (recent.length >= VERIFY_OTP_MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((VERIFY_OTP_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  return { allowed: true };
}

/**
 * Records an OTP verification attempt for an IP address.
 */
export function recordVerifyOtpAttempt(ip: string): void {
  const key = ip || "unknown_ip";
  const now = Date.now();
  const record = ipStore.get(key);

  if (!record) {
    ipStore.set(key, { timestamps: [now] });
  } else {
    const recent = record.timestamps.filter((t: number) => now - t < VERIFY_OTP_WINDOW_MS);
    recent.push(now);
    record.timestamps = recent;
  }
}

/**
 * Utility for automated tests to clear rate limit records.
 */
export function clearRateLimitsForTesting(): void {
  emailStore.clear();
  ipStore.clear();
}
