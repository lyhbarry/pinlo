import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }
  if (id === dbUser.id) {
    return new Response("Cannot remove yourself", { status: 400 });
  }

  const { data: target } = await db
    .from("User")
    .select("id, role")
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId)
    .single();

  if (!target) return new Response("Not Found", { status: 404 });

  if ((target as { role: string }).role === "OWNER" && dbUser.role !== "OWNER") {
    return new Response("Forbidden", { status: 403 });
  }

  await db.from("User").delete().eq("id", id);

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);

  return new Response(null, { status: 204 });
}
