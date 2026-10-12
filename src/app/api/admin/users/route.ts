import { NextRequest } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdminSession>>;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const where: Prisma.UserWhereInput = {
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
    ...(role && ["USER", "ADMIN"].includes(role) ? { role: role as "USER" | "ADMIN" } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { reservations: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  void admin; // used for auth above
  return Response.json({ users, total, page, limit }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdminSession>>;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { userId?: unknown; isActive?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, isActive } = body;

  if (typeof userId !== "string" || !userId.trim()) {
    return Response.json({ error: "User ID is required." }, { status: 400 });
  }
  if (typeof isActive !== "boolean") {
    return Response.json({ error: "isActive must be a boolean." }, { status: 400 });
  }

  // Prevent admin from deactivating themselves
  if (userId.trim() === admin.id && !isActive) {
    return Response.json(
      { error: "Administrators cannot deactivate their own account." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId.trim() },
    select: { id: true },
  });
  if (!target) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return Response.json(
    {
      message: `User account ${isActive ? "activated" : "deactivated"} successfully.`,
      user: updated,
    },
    { status: 200 }
  );
}
