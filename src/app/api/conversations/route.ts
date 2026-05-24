import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: dbUser.tenantId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      contact: true,
      messages: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  return Response.json(conversations);
}
