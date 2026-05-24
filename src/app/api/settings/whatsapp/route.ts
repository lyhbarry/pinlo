import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

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
