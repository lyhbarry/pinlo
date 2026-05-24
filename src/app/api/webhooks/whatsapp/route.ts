import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { checkLimit } from "@/lib/plan";

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

interface WhatsAppValue {
  messaging_product: string;
  metadata: { phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
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
  let payload: WhatsAppPayload;

  try {
    payload = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

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

      if (!messages.length) continue;

      // Find the tenant by WhatsApp Phone Number ID
      const tenant = await prisma.tenant.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });

      if (!tenant) continue;

      for (const msg of messages) {
        const contactInfo = contacts.find((c) => c.wa_id === msg.from);
        const phone = msg.from;
        const name = contactInfo?.profile?.name ?? phone;
        const body = msg.text?.body ?? `[${msg.type}]`;
        const timestamp = new Date(parseInt(msg.timestamp, 10) * 1000);

        // Upsert contact
        const contact = await prisma.contact.upsert({
          where: { tenantId_phone: { tenantId: tenant.id, phone } },
          create: { tenantId: tenant.id, name, phone, tags: [] },
          update: { name },
        });

        // Find or create open conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            tenantId: tenant.id,
            contactId: contact.id,
            status: "OPEN",
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              tenantId: tenant.id,
              contactId: contact.id,
              status: "OPEN",
              lastMessageAt: timestamp,
            },
          });
        }

        // Save message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: "INBOUND",
            body,
            timestamp,
            status: "DELIVERED",
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: timestamp },
        });
      }
    }
  }

  return new Response("OK", { status: 200 });
}
