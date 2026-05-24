import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return new Response("Bad Request", { status: 400 });

  await db
    .from("Tenant")
    .update({ name: name.trim() })
    .eq("id", dbUser.tenantId);

  return new Response(null, { status: 204 });
}
