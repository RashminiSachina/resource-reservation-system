import { requireUserSession, AuthError } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await requireUserSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      capacity: true,
      category: { select: { id: true, name: true } },
    },
  });

  return Response.json({ resources }, { status: 200 });
}
