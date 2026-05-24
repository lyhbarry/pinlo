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

  const { status } = await req.json();
  if (status !== "OPEN" && status !== "CLOSED") return new Response("Bad Request", { status: 400 });

  await db
    .from("Conversation")
    .update({ status })
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId);

  return new Response(null, { status: 204 });
}
