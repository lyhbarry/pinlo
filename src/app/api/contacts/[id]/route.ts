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

  const { name, tags } = await req.json();
  if (!name?.trim()) return new Response("Bad Request", { status: 400 });

  await prisma.contact.updateMany({
    where: { id, tenantId: dbUser.tenantId },
    data: { name: name.trim(), tags: tags ?? [] },
  });

  return new Response(null, { status: 204 });
}
