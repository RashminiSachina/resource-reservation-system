import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, password } = body;

  // --- Server-side validation ---
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Full name is required." }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "Email address is required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Response.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // --- Check for existing user ---
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // --- Hash password (cost factor 12) ---
  const passwordHash = await bcrypt.hash(password, 12);

  // --- Create user ---
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
    // Never return passwordHash or googleId
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return Response.json(
    { message: "Account created successfully.", user },
    { status: 201 }
  );
}
