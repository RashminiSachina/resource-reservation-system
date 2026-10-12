import { NextRequest } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const active = searchParams.get("active");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const where: Prisma.ResourceWhereInput = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(active === "true" ? { isActive: true } : active === "false" ? { isActive: false } : {}),
  };

  const [resources, total, categories] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        capacity: true,
        isActive: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
    }),
    prisma.resource.count({ where }),
    prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return Response.json({ resources, total, page, limit, categories }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    name?: unknown;
    description?: unknown;
    location?: unknown;
    capacity?: unknown;
    categoryId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, description, location, capacity, categoryId } = body;

  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Resource name is required." }, { status: 400 });
  }
  if (typeof categoryId !== "string" || !categoryId.trim()) {
    return Response.json({ error: "Category is required." }, { status: 400 });
  }

  const category = await prisma.resourceCategory.findUnique({
    where: { id: categoryId.trim() },
    select: { id: true },
  });
  if (!category) {
    return Response.json({ error: "Category not found." }, { status: 404 });
  }

  const resource = await prisma.resource.create({
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      location: typeof location === "string" ? location.trim() || null : null,
      capacity: typeof capacity === "number" && capacity > 0 ? Math.floor(capacity) : null,
      categoryId: category.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      capacity: true,
      isActive: true,
      category: { select: { id: true, name: true } },
    },
  });

  return Response.json({ message: "Resource created.", resource }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    resourceId?: unknown;
    name?: unknown;
    description?: unknown;
    location?: unknown;
    capacity?: unknown;
    categoryId?: unknown;
    isActive?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resourceId, name, description, location, capacity, categoryId, isActive } = body;

  if (typeof resourceId !== "string" || !resourceId.trim()) {
    return Response.json({ error: "Resource ID is required." }, { status: 400 });
  }

  const existing = await prisma.resource.findUnique({
    where: { id: resourceId.trim() },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "Resource not found." }, { status: 404 });
  }

  // Validate categoryId if provided
  if (categoryId !== undefined) {
    if (typeof categoryId !== "string" || !categoryId.trim()) {
      return Response.json({ error: "Invalid category." }, { status: 400 });
    }
    const cat = await prisma.resourceCategory.findUnique({ where: { id: categoryId.trim() }, select: { id: true } });
    if (!cat) return Response.json({ error: "Category not found." }, { status: 404 });
  }

  const updated = await prisma.resource.update({
    where: { id: existing.id },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(typeof description === "string" ? { description: description.trim() || null } : {}),
      ...(typeof location === "string" ? { location: location.trim() || null } : {}),
      ...(typeof capacity === "number" ? { capacity: capacity > 0 ? Math.floor(capacity) : null } : {}),
      ...(typeof categoryId === "string" && categoryId.trim() ? { categoryId: categoryId.trim() } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      capacity: true,
      isActive: true,
      category: { select: { id: true, name: true } },
    },
  });

  return Response.json({ message: "Resource updated.", resource: updated }, { status: 200 });
}
