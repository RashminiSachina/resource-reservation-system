import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_FROM = process.env.SMTP_FROM || "noreply@reserveit.local";

// Create transporter (lazy initialization)
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error("Email configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
    }

    const secure = SMTP_SECURE === "true" || SMTP_PORT === 465;

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface ReservationEmailParams {
  to: string;
  userName: string;
  reservationId: string;
  resourceName: string;
  startTime: Date;
  endTime: Date;
  status: "CONFIRMED" | "CANCELLED" | "REJECTED";
}

/**
 * Send reservation status update email
 */
export async function sendReservationStatusEmail(params: ReservationEmailParams): Promise<void> {
  try {
    const transporter = getTransporter();

    const { to, userName, reservationId, resourceName, startTime, endTime, status } = params;

    // Format date/time
    const dateStr = new Date(startTime).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const startStr = new Date(startTime).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endStr = new Date(endTime).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Determine subject and content based on status
    let subject: string;
    let htmlContent: string;

    if (status === "CONFIRMED") {
      subject = "Your Reservation Has Been Approved";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0052CC;">Reservation Approved</h2>
          <p>Hi ${userName},</p>
          <p>Good news! Your reservation has been approved.</p>

          <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Reservation Details</h3>
            <p><strong>Reservation ID:</strong> ${reservationId}</p>
            <p><strong>Resource:</strong> ${resourceName}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${startStr} - ${endStr}</p>
            <p><strong>Status:</strong> <span style="color: #16A34A; font-weight: bold;">CONFIRMED</span></p>
          </div>

          <p>Please arrive on time and enjoy your reservation!</p>
          <p style="color: #6B7280; font-size: 14px;">This is an automated message. Please do not reply.</p>
        </div>
      `;
    } else if (status === "CANCELLED") {
      subject = "Your Reservation Has Been Cancelled";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Reservation Cancelled</h2>
          <p>Hi ${userName},</p>
          <p>Your reservation has been cancelled.</p>

          <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Cancelled Reservation Details</h3>
            <p><strong>Reservation ID:</strong> ${reservationId}</p>
            <p><strong>Resource:</strong> ${resourceName}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${startStr} - ${endStr}</p>
            <p><strong>Status:</strong> <span style="color: #DC2626; font-weight: bold;">CANCELLED</span></p>
          </div>

          <p>If you have any questions, please contact your administrator.</p>
          <p style="color: #6B7280; font-size: 14px;">This is an automated message. Please do not reply.</p>
        </div>
      `;
    } else {
      subject = "Your Reservation Has Been Rejected";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Reservation Rejected</h2>
          <p>Hi ${userName},</p>
          <p>Your reservation request has been rejected.</p>

          <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Rejected Reservation Details</h3>
            <p><strong>Reservation ID:</strong> ${reservationId}</p>
            <p><strong>Resource:</strong> ${resourceName}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${startStr} - ${endStr}</p>
            <p><strong>Status:</strong> <span style="color: #DC2626; font-weight: bold;">REJECTED</span></p>
          </div>

          <p>If you have any questions, please contact your administrator.</p>
          <p style="color: #6B7280; font-size: 14px;">This is an automated message. Please do not reply.</p>
        </div>
      `;
    }

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`[Email] Sent ${status} email to ${to} for reservation ${reservationId}`);
  } catch (error) {
    // Log error without exposing sensitive credentials
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send ${status} email to ${params.to}: ${errorMessage}`);
    // Re-throw so caller can handle the error
    throw error;
  }
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
