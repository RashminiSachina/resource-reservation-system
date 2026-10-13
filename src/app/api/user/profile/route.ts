import { NextRequest } from "next/server";
import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Fetch full user details including whether they have password auth
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true, // Used to determine if user has password-based auth
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!userDetails) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  // Return safe user object
  const safeUser = {
    id: userDetails.id,
    name: userDetails.name,
    email: userDetails.email,
    role: userDetails.role,
    hasPassword: !!userDetails.passwordHash,
    createdAt: userDetails.createdAt,
    updatedAt: userDetails.updatedAt,
  };

  return Response.json({ user: safeUser }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUserSession>>;
  try {
    user = await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name } = body;

  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return Response.json({ error: "Name cannot exceed 100 characters." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: name.trim() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ message: "Profile updated.", user: updated }, { status: 200 });
}
