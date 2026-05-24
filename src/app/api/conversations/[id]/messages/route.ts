import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { checkLimit, getTenantPlan, getPlanLimits } from "@/lib/plan";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenantId: dbUser.tenantId },
    include: {
      contact: true,
      messages: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!conversation) return new Response("Not Found", { status: 404 });

  // Compute isLocked for the contact
  const plan = await getTenantPlan(dbUser.tenantId);
  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;
  let contactIsLocked = false;
  if (maxContacts !== Infinity) {
    const totalContacts = await prisma.contact.count({ where: { tenantId: dbUser.tenantId } });
    if (totalContacts > maxContacts) {
      const allowedContacts = await prisma.contact.findMany({
        where: { tenantId: dbUser.tenantId },
        orderBy: { createdAt: "asc" },
        take: maxContacts,
        select: { id: true },
      });
      const allowedIds = new Set(allowedContacts.map((c) => c.id));
      contactIsLocked = !allowedIds.has(conversation.contact.id);
    }
  }

  return Response.json({ ...conversation, contactIsLocked });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenantId: dbUser.tenantId },
    include: { tenant: true, contact: true },
  });
  if (!conversation) return new Response("Not Found", { status: 404 });

  const { body } = await req.json();
  if (!body?.trim()) return new Response("Bad Request", { status: 400 });

  const msgLimit = await checkLimit(dbUser.tenantId, "monthlyMessageLimit");
  if (!msgLimit.allowed) {
    return Response.json(
      { error: "Monthly message limit reached. Upgrade to Pro to keep sending.", code: "MESSAGE_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  // Check if this contact is beyond the free plan contact limit
  const plan = await getTenantPlan(dbUser.tenantId);
  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;
  if (maxContacts !== Infinity) {
    const totalContacts = await prisma.contact.count({ where: { tenantId: dbUser.tenantId } });
    if (totalContacts > maxContacts) {
      const allowedContacts = await prisma.contact.findMany({
        where: { tenantId: dbUser.tenantId },
        orderBy: { createdAt: "asc" },
        take: maxContacts,
        select: { id: true },
      });
      const allowedIds = new Set(allowedContacts.map((c) => c.id));
      if (!allowedIds.has(conversation.contact.id)) {
        return Response.json(
          { error: "This contact is beyond your free plan limit. Upgrade to Pro to message all contacts.", code: "CONTACT_LOCKED" },
          { status: 403 }
        );
      }
    }
  }

  const now = new Date();
  const message = await prisma.message.create({
    data: { conversationId: id, direction: "OUTBOUND", body, timestamp: now, status: "SENT" },
  });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: now } });

  // Send via Meta WhatsApp API if configured
  const { whatsappPhoneNumberId, whatsappAccessToken } = conversation.tenant;
  if (whatsappPhoneNumberId && whatsappAccessToken) {
    try {
      const waRes = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: conversation.contact.phone,
          type: "text",
          text: { body },
        }),
      });
      if (!waRes.ok) {
        const err = await waRes.json().catch(() => ({}));
        console.error("[whatsapp] send failed:", JSON.stringify(err));
      }
    } catch (e) {
      console.error("[whatsapp] send error:", e);
    }
  } else {
    console.warn("[whatsapp] not configured for tenant", dbUser.tenantId);
  }

  return Response.json(message);
}
