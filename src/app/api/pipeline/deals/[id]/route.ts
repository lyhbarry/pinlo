import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function getAuthedTenantId(user_id: string) {
  const dbUser = await prisma.user.findUnique({ where: { id: user_id } });
  return dbUser?.tenantId ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const tenantId = await getAuthedTenantId(user.id);
  if (!tenantId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const deal = await prisma.deal.findFirst({ where: { id, tenantId } });
  if (!deal) return new Response("Not Found", { status: 404 });

  const updated = await prisma.deal.update({
    where: { id },
    data: {
      ...(body.stageId !== undefined && { stageId: body.stageId }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.value !== undefined && { value: body.value ? parseFloat(body.value) : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.contactId !== undefined && { contactId: body.contactId }),
    },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const tenantId = await getAuthedTenantId(user.id);
  if (!tenantId) return new Response("Unauthorized", { status: 401 });

  const deal = await prisma.deal.findFirst({ where: { id, tenantId } });
  if (!deal) return new Response("Not Found", { status: 404 });

  await prisma.deal.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
