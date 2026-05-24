import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  await db
    .from("QuickReply")
    .delete()
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId);

  return new Response(null, { status: 204 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) return new Response("Bad Request", { status: 400 });

  await db
    .from("QuickReply")
    .update({ title: title.trim(), body: body.trim() })
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId);

  return new Response(null, { status: 204 });
}
