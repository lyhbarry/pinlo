import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const { data: existing } = await db
    .from("Deal")
    .select("id")
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId)
    .single();
  if (!existing) return new Response("Not Found", { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.stageId !== undefined) update.stageId = body.stageId;
  if (body.title !== undefined) update.title = body.title;
  if (body.value !== undefined) update.value = body.value ? parseFloat(body.value) : null;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.contactId !== undefined) update.contactId = body.contactId;

  const { data: updated } = await db
    .from("Deal")
    .update(update)
    .eq("id", id)
    .select("*, contact:Contact(id,name,phone)")
    .single();

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: existing } = await db
    .from("Deal")
    .select("id")
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId)
    .single();
  if (!existing) return new Response("Not Found", { status: 404 });

  await db.from("Deal").delete().eq("id", id);
  return new Response(null, { status: 204 });
}
