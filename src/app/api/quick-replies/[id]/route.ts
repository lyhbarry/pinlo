import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  await prisma.quickReply.deleteMany({
    where: { id, tenantId: dbUser.tenantId },
  });

  return new Response(null, { status: 204 });
}

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

  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) return new Response("Bad Request", { status: 400 });

  const reply = await prisma.quickReply.updateMany({
    where: { id, tenantId: dbUser.tenantId },
    data: { title: title.trim(), body: body.trim() },
  });

  if (!reply.count) return new Response("Not Found", { status: 404 });
  return new Response(null, { status: 204 });
}
