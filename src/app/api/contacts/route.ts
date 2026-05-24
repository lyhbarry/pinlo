import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { checkLimit, getTenantPlan, getPlanLimits } from "@/lib/plan";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { tenantId: dbUser.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conversations: true } },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true, status: true, lastMessageAt: true },
      },
    },
  });

  const plan = await getTenantPlan(dbUser.tenantId);
  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;
  const lockedCount =
    maxContacts !== Infinity && contacts.length > maxContacts
      ? contacts.length - maxContacts
      : 0;

  return Response.json(contacts.map((c, i) => ({ ...c, isLocked: i < lockedCount })));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { name, phone, tags } = await req.json();
  if (!name?.trim() || !phone?.trim()) {
    return new Response("Bad Request", { status: 400 });
  }

  const limitCheck = await checkLimit(dbUser.tenantId, "maxContacts");
  if (!limitCheck.allowed) {
    return Response.json(
      { error: "You've reached the 50 contact limit on the free plan. Upgrade to Pro for unlimited contacts.", code: "CONTACT_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        tenantId: dbUser.tenantId,
        name: name.trim(),
        phone: phone.trim(),
        tags: tags ?? [],
      },
    });
    return Response.json(contact, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return Response.json({ error: "A contact with this phone number already exists." }, { status: 409 });
    }
    throw e;
  }
}
