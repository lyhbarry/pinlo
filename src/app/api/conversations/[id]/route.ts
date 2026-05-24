import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { status } = await req.json();
  if (status !== "OPEN" && status !== "CLOSED") return new Response("Bad Request", { status: 400 });

  await prisma.conversation.updateMany({
    where: { id, tenantId: dbUser.tenantId },
    data: { status },
  });

  return new Response(null, { status: 204 });
}
