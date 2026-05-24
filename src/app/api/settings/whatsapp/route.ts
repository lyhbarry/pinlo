import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

const GRAPH = "https://graph.facebook.com/v19.0";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data } = await db
    .from("Tenant")
    .select("whatsappPhoneNumberId, whatsappAccessToken")
    .eq("id", dbUser.tenantId)
    .single();

  if (!data?.whatsappPhoneNumberId || !data.whatsappAccessToken) {
    return Response.json({ connected: false });
  }

  // Fetch the display phone number from Meta
  let displayPhoneNumber: string | null = null;
  try {
    const res = await fetch(
      `${GRAPH}/${data.whatsappPhoneNumberId}?fields=display_phone_number,verified_name&access_token=${data.whatsappAccessToken}`
    );
    const json = await res.json() as { display_phone_number?: string; verified_name?: string; error?: { message: string } };
    if (res.ok) {
      displayPhoneNumber = json.display_phone_number ?? null;
    } else {
      console.error("[WA] fetch phone number:", JSON.stringify(json.error));
    }
  } catch (err) {
    console.error("[WA] fetch phone number error:", err);
  }

  return Response.json({
    connected: true,
    phoneNumberId: data.whatsappPhoneNumberId,
    displayPhoneNumber,
  });
}

export async function PATCH(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { phoneNumberId, accessToken } = await req.json();

  await db
    .from("Tenant")
    .update({
      whatsappPhoneNumberId: phoneNumberId?.trim() || null,
      whatsappAccessToken: accessToken?.trim() || null,
    })
    .eq("id", dbUser.tenantId);

  return new Response("OK", { status: 200 });
}

export async function DELETE() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  await db
    .from("Tenant")
    .update({ whatsappPhoneNumberId: null, whatsappAccessToken: null })
    .eq("id", dbUser.tenantId);

  return new Response("OK", { status: 200 });
}
