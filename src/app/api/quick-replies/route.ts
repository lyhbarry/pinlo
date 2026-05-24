import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { checkLimit } from "@/lib/plan";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const replies = await prisma.quickReply.findMany({
    where: { tenantId: dbUser.tenantId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(replies);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
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

  const reply = await prisma.quickReply.create({
    data: { tenantId: dbUser.tenantId, title: title.trim(), body: body.trim() },
  });

  return Response.json(reply, { status: 201 });
}
