import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { title, stageId, contactId, value } = await req.json();
  if (!title?.trim() || !stageId) return new Response("Bad Request", { status: 400 });

  const { data: stage } = await db
    .from("PipelineStage")
    .select("id")
    .eq("id", stageId)
    .eq("tenantId", dbUser.tenantId)
    .single();
  if (!stage) return new Response("Not Found", { status: 404 });

  const { data: deal } = await db
    .from("Deal")
    .insert({
      id: crypto.randomUUID(),
      tenantId: dbUser.tenantId,
      stageId,
      title: title.trim(),
      contactId: contactId ?? null,
      value: value ? parseFloat(value) : null,
    })
    .select("*, contact:Contact(id,name,phone)")
    .single();

  return Response.json(deal, { status: 201 });
}
