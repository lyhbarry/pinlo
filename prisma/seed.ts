import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("No tenant found — sign up first, then run the seed.");
    process.exit(1);
  }

  console.log(`Seeding for tenant: ${tenant.name} (${tenant.id})`);

  // Clean existing seed data for this tenant
  await prisma.message.deleteMany({
    where: { conversation: { tenantId: tenant.id } },
  });
  await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });

  const contacts = [
    { name: "Sarah Chen", phone: "6591234567", tags: ["lead", "enterprise"] },
    { name: "Marcus Williams", phone: "6598765432", tags: ["customer", "vip"] },
    { name: "Priya Patel", phone: "6581234567", tags: ["lead"] },
    { name: "James Okonkwo", phone: "6571234567", tags: ["customer"] },
    { name: "Aiko Tanaka", phone: "6561234567", tags: ["lead", "trial"] },
  ];

  const now = new Date();
  const mins = (n: number) => new Date(now.getTime() - n * 60 * 1000);
  const hours = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);
  const days = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const conversations: Array<{
    contact: (typeof contacts)[0];
    status: "OPEN" | "CLOSED";
    messages: Array<{ direction: "INBOUND" | "OUTBOUND"; body: string; timestamp: Date }>;
  }> = [
    {
      contact: contacts[0],
      status: "OPEN",
      messages: [
        { direction: "INBOUND", body: "Hi! I saw your product on LinkedIn and I'm really interested.", timestamp: hours(2) },
        { direction: "OUTBOUND", body: "Hey Sarah! Great to hear from you. What are you looking to solve?", timestamp: hours(1.9) },
        { direction: "INBOUND", body: "We're struggling with managing customer conversations across our sales team. We have about 20 reps.", timestamp: hours(1.8) },
        { direction: "OUTBOUND", body: "That's exactly what Pinlo is built for. Would you be open to a quick 15-min demo this week?", timestamp: hours(1.7) },
        { direction: "INBOUND", body: "Absolutely! Thursday afternoon works for me.", timestamp: mins(45) },
      ],
    },
    {
      contact: contacts[1],
      status: "OPEN",
      messages: [
        { direction: "INBOUND", body: "Hey, just renewed my subscription. Love the new contact tagging feature!", timestamp: days(1) },
        { direction: "OUTBOUND", body: "Thanks Marcus! Really glad you're finding it useful. Any feedback for us?", timestamp: days(1) },
        { direction: "INBOUND", body: "Would be great to have bulk message sending. That's the one thing I keep wishing for.", timestamp: hours(3) },
        { direction: "OUTBOUND", body: "Noted! That's on our roadmap for Q3. I'll make sure to ping you when it's live.", timestamp: hours(2.5) },
        { direction: "INBOUND", body: "Amazing, thanks!", timestamp: mins(12) },
      ],
    },
    {
      contact: contacts[2],
      status: "OPEN",
      messages: [
        { direction: "INBOUND", body: "Hello, I have a question about your pricing plans.", timestamp: hours(5) },
        { direction: "OUTBOUND", body: "Hi Priya! Happy to help. We have Starter, Growth, and Enterprise plans. Which fits your team size?", timestamp: hours(4.9) },
        { direction: "INBOUND", body: "We're a team of 5 for now but growing fast. Probably 15 by end of year.", timestamp: hours(4.8) },
        { direction: "OUTBOUND", body: "Growth plan would be perfect then — it scales with you. Want me to send over a quote?", timestamp: hours(4.7) },
        { direction: "INBOUND", body: "Yes please! Can you include the annual discount?", timestamp: mins(90) },
      ],
    },
    {
      contact: contacts[3],
      status: "CLOSED",
      messages: [
        { direction: "INBOUND", body: "Hi, my messages aren't sending. Getting an error.", timestamp: days(3) },
        { direction: "OUTBOUND", body: "Hey James, sorry about that! Can you tell me which number you're sending from?", timestamp: days(3) },
        { direction: "INBOUND", body: "+65 7123 4567", timestamp: days(3) },
        { direction: "OUTBOUND", body: "Got it — I can see the issue. Your WhatsApp token had expired. I've refreshed it now. Try again!", timestamp: days(3) },
        { direction: "INBOUND", body: "Works now, thank you so much!", timestamp: days(2) },
        { direction: "OUTBOUND", body: "Great! We've also added auto-token refresh so this won't happen again. Let me know if anything else comes up.", timestamp: days(2) },
      ],
    },
    {
      contact: contacts[4],
      status: "OPEN",
      messages: [
        { direction: "INBOUND", body: "Hi! I signed up for the trial yesterday. How do I connect my WhatsApp number?", timestamp: hours(1) },
        { direction: "OUTBOUND", body: "Welcome Aiko! Head to Settings → WhatsApp and paste your Phone Number ID from the Meta dashboard. Takes about 2 minutes!", timestamp: mins(55) },
        { direction: "INBOUND", body: "Found it! Setting it up now 🙏", timestamp: mins(30) },
      ],
    },
  ];

  for (const conv of conversations) {
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        name: conv.contact.name,
        phone: conv.contact.phone,
        tags: conv.contact.tags,
      },
    });

    const lastMsg = conv.messages[conv.messages.length - 1];
    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        status: conv.status,
        lastMessageAt: lastMsg.timestamp,
      },
    });

    await prisma.message.createMany({
      data: conv.messages.map((m) => ({
        conversationId: conversation.id,
        direction: m.direction,
        body: m.body,
        timestamp: m.timestamp,
        status: "DELIVERED",
      })),
    });
  }

  console.log(`✓ Seeded ${conversations.length} conversations with messages.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
