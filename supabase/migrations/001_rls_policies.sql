-- Enable RLS on all tables managed by Prisma
-- Run this in the Supabase SQL editor after running `prisma migrate deploy`

-- ============================================================
-- Enable Row Level Security
-- ============================================================

ALTER TABLE "Tenant"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get the tenantId for the current JWT user
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT "tenantId"
  FROM "User"
  WHERE id = auth.uid()::text
  LIMIT 1;
$$;

-- ============================================================
-- Tenant policies
-- ============================================================

CREATE POLICY "tenant_select_own"
  ON "Tenant" FOR SELECT
  USING (id = public.current_tenant_id());

-- ============================================================
-- User policies
-- ============================================================

CREATE POLICY "user_select_own_tenant"
  ON "User" FOR SELECT
  USING ("tenantId" = public.current_tenant_id());

CREATE POLICY "user_update_self"
  ON "User" FOR UPDATE
  USING (id = auth.uid()::text);

-- ============================================================
-- Contact policies
-- ============================================================

CREATE POLICY "contact_select_own_tenant"
  ON "Contact" FOR SELECT
  USING ("tenantId" = public.current_tenant_id());

CREATE POLICY "contact_insert_own_tenant"
  ON "Contact" FOR INSERT
  WITH CHECK ("tenantId" = public.current_tenant_id());

CREATE POLICY "contact_update_own_tenant"
  ON "Contact" FOR UPDATE
  USING ("tenantId" = public.current_tenant_id());

CREATE POLICY "contact_delete_own_tenant"
  ON "Contact" FOR DELETE
  USING ("tenantId" = public.current_tenant_id());

-- ============================================================
-- Conversation policies
-- ============================================================

CREATE POLICY "conversation_select_own_tenant"
  ON "Conversation" FOR SELECT
  USING ("tenantId" = public.current_tenant_id());

CREATE POLICY "conversation_insert_own_tenant"
  ON "Conversation" FOR INSERT
  WITH CHECK ("tenantId" = public.current_tenant_id());

CREATE POLICY "conversation_update_own_tenant"
  ON "Conversation" FOR UPDATE
  USING ("tenantId" = public.current_tenant_id());

-- ============================================================
-- Message policies (accessed via conversation membership)
-- ============================================================

CREATE POLICY "message_select_own_tenant"
  ON "Message" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "Message"."conversationId"
        AND c."tenantId" = public.current_tenant_id()
    )
  );

CREATE POLICY "message_insert_own_tenant"
  ON "Message" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "Message"."conversationId"
        AND c."tenantId" = public.current_tenant_id()
    )
  );

-- ============================================================
-- Service role bypass (for webhook handler using service key)
-- All policies above are bypassed when SUPABASE_SERVICE_ROLE_KEY
-- is used, so the webhook can write freely.
-- ============================================================
