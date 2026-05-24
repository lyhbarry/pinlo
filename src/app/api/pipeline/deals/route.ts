import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { title, stageId, contactId, value } = await req.json();
  if (!title?.trim() || !stageId) return new Response("Bad Request", { status: 400 });

  // Verify stage belongs to this tenant
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, tenantId: dbUser.tenantId },
  });
  if (!stage) return new Response("Not Found", { status: 404 });

  const deal = await prisma.deal.create({
    data: {
      tenantId: dbUser.tenantId,
      stageId,
      title: title.trim(),
      contactId: contactId ?? null,
      value: value ? parseFloat(value) : null,
    },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

  return Response.json(deal, { status: 201 });
}
