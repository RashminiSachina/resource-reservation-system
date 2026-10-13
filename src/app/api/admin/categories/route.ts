import { NextRequest } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * GET /api/admin/categories
 * Returns all resource categories ordered alphabetically by name,
 * including a count of associated resources.
 * Protected: ADMIN role only.
 */
export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: { resources: true },
        },
      },
    });

    return Response.json({ categories }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to fetch categories. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Creates a new resource category.
 * Protected: ADMIN role only.
 * Body: { name: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { name, description } = body;

  // Validate Name
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Category name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return Response.json({ error: "Category name cannot exceed 100 characters." }, { status: 400 });
  }

  // Validate Description (optional)
  let trimmedDesc: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return Response.json({ error: "Description must be a string." }, { status: 400 });
    }
    const d = description.trim();
    if (d.length > 500) {
      return Response.json({ error: "Description cannot exceed 500 characters." }, { status: 400 });
    }
    trimmedDesc = d.length > 0 ? d : null;
  }

  // Case-insensitive duplicate check
  try {
    const existing = await prisma.resourceCategory.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      return Response.json(
        { error: "A category with this name already exists." },
        { status: 409 }
      );
    }

    const category = await prisma.resourceCategory.create({
      data: {
        name: trimmedName,
        description: trimmedDesc,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: { resources: true },
        },
      },
    });

    return Response.json(
      {
        message: "Category created successfully.",
        category,
      },
      { status: 201 }
    );
  } catch (err) {
    // Graceful Prisma P2002 Unique Constraint violation handling
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return Response.json(
        { error: "A category with this name already exists." },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Failed to create category. Please try again later." },
      { status: 500 }
    );
  }
}
