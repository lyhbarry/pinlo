import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { phoneNumberId, accessToken } = await req.json();

  await prisma.tenant.update({
    where: { id: dbUser.tenantId },
    data: {
      whatsappPhoneNumberId: phoneNumberId?.trim() || null,
      whatsappAccessToken: accessToken?.trim() || null,
    },
  });

  return new Response("OK", { status: 200 });
}
