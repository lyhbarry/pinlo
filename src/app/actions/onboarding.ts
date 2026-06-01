"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

export async function selectTemplate(templateId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  const { data: dbUser } = await db
    .from("User")
    .select("id, tenantId")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    // Auth user exists but DB User row was never created — corrupted signup.
    await supabase.auth.signOut();
    return { error: "incomplete_setup" };
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
      await db.from("PipelineStage").insert({ id: crypto.randomUUID(), tenantId, name, order });
    }

    for (const { title, body } of template.quickReplies) {
      await db.from("QuickReply").insert({ id: crypto.randomUUID(), tenantId, title, body });
    }
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    data: { onboarding_complete: true },
  });
  if (updateErr) return { error: updateErr.message };

  // Refresh so the updated user_metadata (onboarding_complete: true) is
  // reflected in the JWT that the middleware will read on the next request.
  await supabase.auth.refreshSession();
  return { done: true };
}
