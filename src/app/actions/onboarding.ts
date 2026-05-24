"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

export async function selectTemplate(templateId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const { data: dbUser } = await db
    .from("User")
    .select("id, tenantId")
    .eq("id", session.user.id)
    .single();

  if (!dbUser) {
    // Auth user exists but public.User was never created — corrupted signup.
    // Sign them out so they can sign up again cleanly.
    await supabase.auth.signOut();
    return { error: "Account setup is incomplete. Please sign up again." };
  }

  const tenantId = (dbUser as { tenantId: string }).tenantId;
  const id = (templateId in TEMPLATES ? templateId : "generic_crm") as TemplateId;
  const template = TEMPLATES[id];

  const { data: tenant } = await db
    .from("Tenant")
    .select("template")
    .eq("id", tenantId)
    .single();

  if (!tenant?.template) {
    const { error: tenantErr } = await db
      .from("Tenant")
      .update({ template: id, contactFields: template.contactFields })
      .eq("id", tenantId);
    if (tenantErr) return { error: tenantErr.message };

    for (const [order, name] of template.stages.entries()) {
      await db.from("PipelineStage").insert({ tenantId, name, order });
    }

    for (const { title, body } of template.quickReplies) {
      await db.from("QuickReply").insert({ tenantId, title, body });
    }
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    data: { onboarding_complete: true },
  });
  if (updateErr) return { error: updateErr.message };

  await supabase.auth.refreshSession();
  return {};
}
