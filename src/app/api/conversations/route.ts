import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: conversations } = await db
    .from("Conversation")
    .select("*, contact:Contact(*), messages:Message(id,body,direction,status,timestamp)")
    .eq("tenantId", dbUser.tenantId)
    .order("lastMessageAt", { ascending: false })
    .order("timestamp", { ascending: false, referencedTable: "Message" })
    .limit(1, { referencedTable: "Message" });

  return Response.json(conversations ?? []);
}
