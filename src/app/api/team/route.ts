import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLimit, getPlanId } from "@/lib/plan";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { data: members } = await db
    .from("User")
    .select("id, email, role, createdAt")
    .eq("tenantId", dbUser.tenantId)
    .order("createdAt", { ascending: true });

  return Response.json(members ?? []);
}

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email?.trim()) return new Response("Bad Request", { status: 400 });

  const memberRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

  const plan = getPlanId(dbUser.tenant.stripeSubscriptionStatus);
  const limit = await checkLimit(dbUser.tenantId, "maxUsers", plan);
  if (!limit.allowed) {
    return Response.json(
      {
        error: `You've reached the ${limit.limit}-member limit on the free plan. Upgrade to Pro for unlimited team members.`,
        code: "USER_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/set-password`,
      data: { onboarding_complete: true },
    }
  );

  if (inviteError || !invited.user) {
    return Response.json(
      { error: inviteError?.message ?? "Failed to send invite." },
      { status: 500 }
    );
  }

  const { error: dbError } = await db.from("User").insert({
    id: invited.user.id,
    email: email.trim().toLowerCase(),
    tenantId: dbUser.tenantId,
    role: memberRole,
  });

  if (dbError) {
    if (dbError.code === "23505") {
      return Response.json(
        { error: "This user is already a member of your workspace." },
        { status: 409 }
      );
    }
    return Response.json({ error: "Failed to add user to workspace." }, { status: 500 });
  }

  return Response.json({ email: email.trim().toLowerCase(), role: memberRole }, { status: 201 });
}
