import { type NextRequest } from "next/server";
import { db } from "@/lib/db";

async function verifySignature(rawBody: ArrayBuffer, signatureHeader: string | null): Promise<boolean> {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = signatureHeader.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, rawBody);
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// --- Meta webhook verification ---
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// --- Meta webhook event types ---
interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "sticker";
  text?: { body: string };
}

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

interface WhatsAppStatus {
  id: string; // wamid
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppValue {
  messaging_product: string;
  metadata: { phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

interface WhatsAppPayload {
  object: string;
  entry: WhatsAppEntry[];
}

// --- Inbound message handler ---
export async function POST(request: NextRequest) {
  const rawBody = await request.arrayBuffer();
  const sig = request.headers.get("x-hub-signature-256");
  console.log("[WH] POST hit | bodyLen:", rawBody.byteLength, "| hasSig:", !!sig);
  const valid = await verifySignature(rawBody, sig);
  if (!valid) {
    console.error("[WH] signature invalid | FACEBOOK_APP_SECRET set:", !!process.env.FACEBOOK_APP_SECRET);
    return new Response("Forbidden", { status: 403 });
  }

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  console.log("[WH] payload.object:", payload.object);
  if (payload.object !== "whatsapp_business_account") {
    return new Response("OK", { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const { value } = change;
      const phoneNumberId = value.metadata?.phone_number_id;
      const messages = value.messages ?? [];
      const contacts = value.contacts ?? [];

      // Handle delivery/read status updates
      const statuses = value.statuses ?? [];
      for (const s of statuses) {
        const statusMap: Record<string, string> = {
          sent: "SENT",
          delivered: "DELIVERED",
          read: "READ",
          failed: "FAILED",
        };
        const newStatus = statusMap[s.status];
        if (newStatus) {
          await db.from("Message").update({ status: newStatus }).eq("wamid", s.id);
        }
      }

      if (!messages.length) continue;

      const { data: tenant, error: tenantErr } = await db
        .from("Tenant")
        .select("*")
        .eq("whatsappPhoneNumberId", phoneNumberId)
        .maybeSingle();

      if (tenantErr) {
        console.error("[WH] tenant lookup error for phoneNumberId:", phoneNumberId, tenantErr.message);
        continue;
      }
      if (!tenant) {
        console.warn("[WH] no tenant found for phoneNumberId:", phoneNumberId);
        continue;
      }

      const tenantId = (tenant as { id: string }).id;

      for (const msg of messages) {
        const contactInfo = contacts.find((c) => c.wa_id === msg.from);
        const phone = msg.from;
        const name = contactInfo?.profile?.name ?? phone;
        const body = msg.text?.body ?? `[${msg.type}]`;
        const timestamp = new Date(parseInt(msg.timestamp, 10) * 1000);

        // Upsert contact
        const { data: existingContact } = await db
          .from("Contact")
          .select("*")
          .eq("tenantId", tenantId)
          .eq("phone", phone)
          .maybeSingle();

        let contact;
        if (existingContact) {
          const { data } = await db
            .from("Contact")
            .update({ name })
            .eq("id", (existingContact as { id: string }).id)
            .select()
            .single();
          contact = data;
        } else {
          const { data } = await db
            .from("Contact")
            .insert({ id: crypto.randomUUID(), tenantId, name, phone, tags: [] })
            .select()
            .single();
          contact = data;
        }

        if (!contact) continue;

        const contactId = (contact as { id: string }).id;

        // Find or create open conversation
        const { data: existingConv } = await db
          .from("Conversation")
          .select("*")
          .eq("tenantId", tenantId)
          .eq("contactId", contactId)
          .eq("status", "OPEN")
          .maybeSingle();

        let conversationId: string;
        if (existingConv) {
          conversationId = (existingConv as { id: string }).id;
        } else {
          const { data: newConv } = await db
            .from("Conversation")
            .insert({ id: crypto.randomUUID(), tenantId, contactId, status: "OPEN", lastMessageAt: timestamp.toISOString() })
            .select("id")
            .single();
          if (!newConv) continue;
          conversationId = (newConv as { id: string }).id;
        }

        // Save message
        await db.from("Message").insert({
          id: crypto.randomUUID(),
          conversationId,
          direction: "INBOUND",
          body,
          timestamp: timestamp.toISOString(),
          status: "DELIVERED",
        });

        // Update conversation timestamp
        await db
          .from("Conversation")
          .update({ lastMessageAt: timestamp.toISOString() })
          .eq("id", conversationId);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
