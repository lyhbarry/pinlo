import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { checkLimit, getTenantPlan, getPlanLimits } from "@/lib/plan";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: contacts } = await db
    .from("Contact")
    .select("*, conversations:Conversation(id, status, lastMessageAt)")
    .eq("tenantId", dbUser.tenantId)
    .order("createdAt", { ascending: false })
    .order("lastMessageAt", { ascending: false, referencedTable: "Conversation" });

  const plan = await getTenantPlan(dbUser.tenantId);
  const limits = getPlanLimits(plan);
  const maxContacts = limits.maxContacts as number;
  const all = contacts ?? [];
  const lockedCount =
    maxContacts !== Infinity && all.length > maxContacts
      ? all.length - maxContacts
      : 0;

  return Response.json(
    all.map((c, i) => {
      const convs = (c.conversations as unknown[]) ?? [];
      return {
        ...c,
        conversations: convs.slice(0, 1),
        _count: { conversations: convs.length },
        isLocked: i < lockedCount,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
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

  const { data: contact, error } = await db
    .from("Contact")
    .insert({
      tenantId: dbUser.tenantId,
      name: name.trim(),
      phone: phone.trim(),
      tags: tags ?? [],
    })
    .select()
    .single();

  if (error?.code === "23505") {
    return Response.json({ error: "A contact with this phone number already exists." }, { status: 409 });
  }
  if (error) throw error;

  return Response.json(contact, { status: 201 });
}
