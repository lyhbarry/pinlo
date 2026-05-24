import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { checkLimit } from "@/lib/plan";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: replies } = await db
    .from("QuickReply")
    .select("*")
    .eq("tenantId", dbUser.tenantId)
    .order("createdAt", { ascending: true });

  return Response.json(replies ?? []);
}

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) return new Response("Bad Request", { status: 400 });

  const limitCheck = await checkLimit(dbUser.tenantId, "maxQuickReplies");
  if (!limitCheck.allowed) {
    return Response.json(
      { error: `You've reached the ${limitCheck.limit} quick reply limit on the free plan. Upgrade to Pro for unlimited quick replies.`, code: "QUICK_REPLY_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  const { data: reply } = await db
    .from("QuickReply")
    .insert({ id: crypto.randomUUID(), tenantId: dbUser.tenantId, title: title.trim(), body: body.trim() })
    .select()
    .single();

  return Response.json(reply, { status: 201 });
}
