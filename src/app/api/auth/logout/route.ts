import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ message: "Logged out successfully." }, { status: 200 });
}
