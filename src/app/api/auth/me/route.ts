import { getAuthenticatedUser } from "@/lib/session";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
    { status: 200 }
  );
}
