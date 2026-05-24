import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { checkLimit, getPlanId, getPlanLimits } from "@/lib/plan";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  // Derive plan from already-fetched tenant — no extra DB call
  const plan = getPlanId(dbUser.tenant.stripeSubscriptionStatus);
  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;

  // Fetch conversation and (if on free plan) contact count in parallel
  const [{ data: conversation }, countResult] = await Promise.all([
    db
      .from("Conversation")
      .select("*, contact:Contact(*), messages:Message(*)")
      .eq("id", id)
      .eq("tenantId", dbUser.tenantId)
      .order("timestamp", { ascending: true, referencedTable: "Message" })
      .single(),
    maxContacts !== Infinity
      ? db.from("Contact").select("*", { count: "exact", head: true }).eq("tenantId", dbUser.tenantId)
      : Promise.resolve({ count: 0 }),
  ]);

  if (!conversation) return new Response("Not Found", { status: 404 });

  let contactIsLocked = false;
  if (maxContacts !== Infinity) {
    const totalContacts = (countResult as { count: number | null }).count ?? 0;
    if (totalContacts > maxContacts) {
      const { data: allowed } = await db
        .from("Contact")
        .select("id")
        .eq("tenantId", dbUser.tenantId)
        .order("createdAt", { ascending: true })
        .limit(maxContacts);
      const allowedIds = new Set((allowed ?? []).map((c: { id: string }) => c.id));
      contactIsLocked = !allowedIds.has((conversation.contact as { id: string }).id);
    }
  }

  return Response.json({ ...conversation, contactIsLocked });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: conversation } = await db
    .from("Conversation")
    .select("*, tenant:Tenant(*), contact:Contact(*)")
    .eq("id", id)
    .eq("tenantId", dbUser.tenantId)
    .single();
  if (!conversation) return new Response("Not Found", { status: 404 });

  const { body } = await req.json();
  if (!body?.trim()) return new Response("Bad Request", { status: 400 });

  // Use plan from already-fetched tenant — no extra DB call
  const plan = getPlanId(dbUser.tenant.stripeSubscriptionStatus);

  const msgLimit = await checkLimit(dbUser.tenantId, "monthlyMessageLimit", plan);
  if (!msgLimit.allowed) {
    return Response.json(
      { error: "Monthly message limit reached. Upgrade to Pro to keep sending.", code: "MESSAGE_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;
  if (maxContacts !== Infinity) {
    const { count: totalContacts } = await db
      .from("Contact")
      .select("*", { count: "exact", head: true })
      .eq("tenantId", dbUser.tenantId);
    if ((totalContacts ?? 0) > maxContacts) {
      const { data: allowed } = await db
        .from("Contact")
        .select("id")
        .eq("tenantId", dbUser.tenantId)
        .order("createdAt", { ascending: true })
        .limit(maxContacts);
      const allowedIds = new Set((allowed ?? []).map((c: { id: string }) => c.id));
      if (!allowedIds.has((conversation.contact as { id: string }).id)) {
        return Response.json(
          { error: "This contact is beyond your free plan limit. Upgrade to Pro to message all contacts.", code: "CONTACT_LOCKED" },
          { status: 403 }
        );
      }
    }
  }

  const now = new Date();
  const { data: message } = await db
    .from("Message")
    .insert({ conversationId: id, direction: "OUTBOUND", body, timestamp: now.toISOString(), status: "SENT" })
    .select()
    .single();

  await db
    .from("Conversation")
    .update({ lastMessageAt: now.toISOString() })
    .eq("id", id);

  const tenant = conversation.tenant as { whatsappPhoneNumberId: string | null; whatsappAccessToken: string | null };
  const contact = conversation.contact as { phone: string };
  const { whatsappPhoneNumberId, whatsappAccessToken } = tenant;
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
          to: contact.phone,
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
