import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const [stages, deals] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { tenantId: dbUser.tenantId },
      orderBy: { order: "asc" },
    }),
    prisma.deal.findMany({
      where: { tenantId: dbUser.tenantId },
      orderBy: { createdAt: "asc" },
      include: { contact: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  return Response.json({ stages, deals });
}
