import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const [{ data: stages }, { data: deals }] = await Promise.all([
    db
      .from("PipelineStage")
      .select("*")
      .eq("tenantId", dbUser.tenantId)
      .order("order", { ascending: true }),
    db
      .from("Deal")
      .select("*, contact:Contact(id,name,phone)")
      .eq("tenantId", dbUser.tenantId)
      .order("createdAt", { ascending: true }),
  ]);

  return Response.json({ stages: stages ?? [], deals: deals ?? [] });
}
