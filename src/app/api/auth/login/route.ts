import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;

  // --- Server-side validation ---
  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return Response.json({ error: "Password is required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // --- Look up user, including passwordHash for comparison only ---
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true, // compared below; never returned in response
      createdAt: true,
    },
  });

  // Generic error — do not reveal whether the email exists
  const invalidCredentials = { error: "Invalid email or password." };

  if (!user) {
    return Response.json(invalidCredentials, { status: 401 });
  }

  // Handle accounts created via Google OAuth (passwordHash is null)
  if (!user.passwordHash) {
    return Response.json(invalidCredentials, { status: 401 });
  }

  // --- Compare password ---
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return Response.json(invalidCredentials, { status: 401 });
  }

  // Account deactivated
  if (!user.isActive) {
    return Response.json(
      { error: "Your account has been deactivated. Please contact support." },
      { status: 403 }
    );
  }

  // Build safe response — passwordHash is never included
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  return Response.json(
    {
      message: "Login successful.",
      user: safeUser,
      // ⚠️ No session / JWT is issued. Session management is not yet implemented.
    },
    { status: 200 }
  );
}
