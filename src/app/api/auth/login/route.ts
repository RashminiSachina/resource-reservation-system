import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

// ADMIN_EMAILS is a server-only env variable — never exposed to the client.
function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;

  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return Response.json({ error: "Password is required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  const invalidCredentials = { error: "Invalid email or password." };

  if (!user) return Response.json(invalidCredentials, { status: 401 });
  if (!user.passwordHash) return Response.json(invalidCredentials, { status: 401 });

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) return Response.json(invalidCredentials, { status: 401 });

  if (!user.isActive) {
    return Response.json(
      { error: "Your account has been deactivated. Please contact support." },
      { status: 403 }
    );
  }

  // --- ADMIN_EMAILS promotion (server-side only; never exposed to client) ---
  let finalRole = user.role;
  if (isAdminEmail(normalizedEmail) && user.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    finalRole = "ADMIN";
  }

  // --- Issue signed HttpOnly session cookie ---
  await setSessionCookie({
    userId: user.id,
    email: user.email,
    role: finalRole,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: finalRole,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  const redirectUrl = finalRole === "ADMIN" ? "/admin" : "/dashboard";

  return Response.json(
    {
      message: "Login successful.",
      user: safeUser,
      redirectUrl,
    },
    { status: 200 }
  );
}
