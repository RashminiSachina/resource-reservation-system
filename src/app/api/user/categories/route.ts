import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/categories
 * Returns all resource categories ordered alphabetically by name.
 * Protected: any authenticated user (USER or ADMIN).
 */
export async function GET() {
  try {
    await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return Response.json({ categories }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to fetch categories. Please try again later." },
      { status: 500 }
    );
  }
}
