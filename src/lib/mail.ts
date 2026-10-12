import nodemailer from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secureStr = process.env.SMTP_SECURE;

  if (!host) {
    return null;
  }

  const port = portStr ? parseInt(portStr, 10) : 587;
  const secure = secureStr === "true" || port === 465;

  const config: SmtpConfig = {
    host,
    port,
    secure,
  };

  if (user && pass) {
    config.auth = { user, pass };
  }

  return config;
}

/**
 * Creates a Nodemailer transporter based on current environment variables.
 * Falls back to a safe dev transport if SMTP variables are not configured in development.
 */
function createTransporter() {
  const config = getSmtpConfig();

  if (config) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // In development without configured SMTP, use Nodemailer's jsonTransport.
    // Notice: Secrets and OTPs are NOT logged to stdout/stderr.
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return null;
}

/**
 * Sends a password reset email with the 6-digit OTP.
 * Returns true if delivery succeeds or was safely simulated in dev;
 * returns false if transporter failed or delivery encountered an error.
 */
export async function sendPasswordResetOtpEmail(
  toEmail: string,
  otp: string,
  userName?: string
): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    // In production without SMTP config, fail safely without throwing unhandled exceptions
    console.error("[Mail Service] SMTP is not configured in production environment.");
    return false;
  }

  const fromAddress = process.env.SMTP_FROM || "ReserveIt Support <no-reply@reserveit.local>";
  const displayName = userName ? userName : "User";

  const subject = "Your Password Reset Verification Code - ReserveIt";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: #4f46e5; color: #ffffff; border-radius: 12px; font-weight: bold; font-size: 20px;">R</div>
      <h2 style="font-size: 20px; font-weight: 700; margin-top: 16px; margin-bottom: 4px; color: #0f172a;">Password Reset Request</h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Resource Reservation Management System</p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
      Hello ${displayName},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
      We received a request to reset the password for your ReserveIt account. Use the verification code below to proceed:
    </p>

    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; border: 1px dashed #cbd5e1;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b; display: inline-block;">${otp}</span>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 20px;">
      <strong>Security notice:</strong> This verification code expires in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact your administrator.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      © ${new Date().getFullYear()} ReserveIt System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Password Reset Request - ReserveIt

Hello ${displayName},

We received a request to reset your password. Use the following 6-digit verification code:

${otp}

This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.
  `.trim();

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html,
    });

    if (!getSmtpConfig() && process.env.NODE_ENV !== "production") {
      // Safe non-sensitive notice in development mode
      console.info("[Mail Service] Email dispatched via development test transport (SMTP not configured).");
    }

    return true;
  } catch {
    // Safe error log: NEVER log OTPs, tokens, or credentials
    console.error("[Mail Service] Failed to deliver password reset email.");
    return false;
  }
}
