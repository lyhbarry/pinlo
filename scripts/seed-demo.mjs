import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const USER_EMAIL = process.env.SEED_USER_EMAIL;

const db = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

// Look up the tenant by user email
const { data: user } = await db
  .from("User")
  .select("tenantId")
  .eq("email", USER_EMAIL)
  .single();

if (!user?.tenantId) {
  console.error("Could not find user/tenant for", USER_EMAIL);
  process.exit(1);
}

const tenantId = user.tenantId;
console.log("Seeding tenant:", tenantId);

// --- Contacts ---
const contacts = [
  { name: "James Okafor",     phone: "+1 (415) •••• 8821", tags: ["hot-lead", "enterprise"] },
  { name: "Sofia Andersen",   phone: "+45 •••• 6234",      tags: ["follow-up"] },
  { name: "Ravi Patel",       phone: "+91 98 •••• 4410",   tags: ["new"] },
  { name: "Camille Dupont",   phone: "+33 6 •••• 7752",    tags: ["hot-lead"] },
  { name: "Marco Esposito",   phone: "+39 347 •••• 903",   tags: ["negotiation"] },
  { name: "Yuki Tanaka",      phone: "+81 90 •••• 1187",   tags: ["closed-won"] },
];

// Delete existing demo data for this tenant (clean slate)
await db.from("Message").delete().in("conversationId",
  (await db.from("Conversation").select("id").eq("tenantId", tenantId)).data?.map(c => c.id) ?? []
);
await db.from("Conversation").delete().eq("tenantId", tenantId);
await db.from("Contact").delete().eq("tenantId", tenantId);

// Insert contacts
const insertedContacts = [];
for (const c of contacts) {
  const { data } = await db
    .from("Contact")
    .insert({ id: crypto.randomUUID(), tenantId, ...c, createdAt: new Date().toISOString() })
    .select()
    .single();
  insertedContacts.push(data);
  console.log("Created contact:", c.name);
}

// --- Conversations + Messages ---

const now = Date.now();
const mins = (n) => new Date(now - n * 60_000).toISOString();

const threads = [
  {
    contact: insertedContacts[0], // James Okafor
    status: "OPEN",
    lastMessageAt: mins(3),
    messages: [
      { direction: "INBOUND",  body: "Hi, I'm interested in your enterprise plan. Can you share the pricing?", ts: mins(45) },
      { direction: "OUTBOUND", body: "Hi James! Great to hear from you. Our Pro plan starts at $29/month — for enterprise we can do custom pricing. What's your team size?", ts: mins(42), status: "READ" },
      { direction: "INBOUND",  body: "We have around 30 people on the sales team. Would there be a volume discount?", ts: mins(38) },
      { direction: "OUTBOUND", body: "Absolutely! For 30+ seats we can work something out. Let me set up a quick call this week. Are you free Thursday?", ts: mins(30), status: "READ" },
      { direction: "INBOUND",  body: "Thursday works. Let's do 3pm EST.", ts: mins(10) },
      { direction: "OUTBOUND", body: "Perfect! I'll send a calendar invite now. Looking forward to it 🙌", ts: mins(3), status: "DELIVERED" },
    ],
  },
  {
    contact: insertedContacts[1], // Sofia Andersen
    status: "OPEN",
    lastMessageAt: mins(22),
    messages: [
      { direction: "INBOUND",  body: "Hello, I found Pinlo on Product Hunt. Does it work with WhatsApp Business?", ts: mins(60) },
      { direction: "OUTBOUND", body: "Hi Sofia! Yes, Pinlo connects directly to WhatsApp Business via the Meta Cloud API. Your whole team shares one inbox.", ts: mins(55), status: "READ" },
      { direction: "INBOUND",  body: "Nice. Can multiple agents reply at the same time without it getting messy?", ts: mins(50) },
      { direction: "OUTBOUND", body: "Exactly — that's the core use case. Everyone sees the same thread, and you can see who's typing or already replied.", ts: mins(45), status: "READ" },
      { direction: "INBOUND",  body: "How much does it cost?", ts: mins(25) },
      { direction: "OUTBOUND", body: "Free plan to get started, Pro at $29/month billed annually. Want me to send you the full pricing breakdown?", ts: mins(22), status: "READ" },
    ],
  },
  {
    contact: insertedContacts[2], // Ravi Patel
    status: "OPEN",
    lastMessageAt: mins(5),
    messages: [
      { direction: "INBOUND",  body: "Quick question — do you support message templates for broadcast campaigns?", ts: mins(90) },
      { direction: "OUTBOUND", body: "Hi Ravi! Not yet, but it's on the roadmap for Q3. Right now we focus on inbound — managing leads and support conversations.", ts: mins(85), status: "READ" },
      { direction: "INBOUND",  body: "Got it. What about bulk contact import? We have ~800 contacts in a CSV.", ts: mins(20) },
      { direction: "OUTBOUND", body: "CSV import is coming soon! For now contacts are created automatically when someone messages you. I'll flag you when it's live if you'd like?", ts: mins(5), status: "SENT" },
    ],
  },
  {
    contact: insertedContacts[3], // Camille Dupont
    status: "OPEN",
    lastMessageAt: mins(1),
    messages: [
      { direction: "INBOUND",  body: "Hi! We've been trialing Pinlo for 2 weeks and the team loves it. How do we upgrade?", ts: mins(15) },
      { direction: "OUTBOUND", body: "That's amazing to hear Camille! 🎉 You can upgrade right from the Billing page in your dashboard — takes about 2 minutes.", ts: mins(12), status: "READ" },
      { direction: "INBOUND",  body: "Do you accept cards from European banks?", ts: mins(5) },
      { direction: "OUTBOUND", body: "Yes! We use Stripe so all major credit and debit cards work, including EU banks. Annual plan saves you 2 months vs monthly.", ts: mins(3), status: "READ" },
      { direction: "INBOUND",  body: "Great, upgrading now. Thanks!", ts: mins(1) },
    ],
  },
  {
    contact: insertedContacts[4], // Marco Esposito
    status: "OPEN",
    lastMessageAt: mins(120),
    messages: [
      { direction: "INBOUND",  body: "Ciao, I run a small e-commerce team in Milan. Does Pinlo integrate with Shopify?", ts: mins(180) },
      { direction: "OUTBOUND", body: "Ciao Marco! Shopify integration isn't live yet but it's on our roadmap. Right now you can manage all your WhatsApp conversations and manually link deals.", ts: mins(175), status: "READ" },
      { direction: "INBOUND",  body: "Okay. How many agents can use it at the same time?", ts: mins(150) },
      { direction: "OUTBOUND", body: "Unlimited on Pro! All your agents share the same inbox. You can see who's handling which conversation in real time.", ts: mins(140), status: "READ" },
      { direction: "INBOUND",  body: "Interesting. Can I book a demo?", ts: mins(120) },
    ],
  },
  {
    contact: insertedContacts[5], // Yuki Tanaka
    status: "OPEN",
    lastMessageAt: mins(2880),
    messages: [
      { direction: "INBOUND",  body: "Hi, we signed up last month but haven't finished setup. Can you help?", ts: mins(3000) },
      { direction: "OUTBOUND", body: "Hi Yuki! Of course — let's get you set up. First step is connecting your WhatsApp Business number in Settings. Have you done that part yet?", ts: mins(2990), status: "READ" },
      { direction: "INBOUND",  body: "Not yet. Is it difficult?", ts: mins(2960) },
      { direction: "OUTBOUND", body: "Takes about 5 minutes! You'll need a Meta Business account. Once connected, all inbound WhatsApp messages appear here automatically.", ts: mins(2950), status: "READ" },
      { direction: "INBOUND",  body: "Understood, I'll try it tonight. Thank you!", ts: mins(2880) },
    ],
  },
];

for (const thread of threads) {
  const { contact, status, lastMessageAt, messages } = thread;

  const { data: conv, error: convErr } = await db
    .from("Conversation")
    .insert({
      id: crypto.randomUUID(),
      tenantId,
      contactId: contact.id,
      status,
      lastMessageAt,
    })
    .select()
    .single();
  if (convErr) { console.error("Conversation insert error:", convErr); process.exit(1); }

  for (const msg of messages) {
    await db.from("Message").insert({
      id: crypto.randomUUID(),
      conversationId: conv.id,
      direction: msg.direction,
      body: msg.body,
      timestamp: msg.ts,
      status: msg.status ?? (msg.direction === "INBOUND" ? "DELIVERED" : "SENT"),
    });
  }

  console.log("Created conversation with", contact.name, `(${messages.length} messages)`);
}

console.log("\nDone! Refresh your dashboard to see the demo data.");
