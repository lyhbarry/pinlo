-- ============================================================
-- 1. Add wamid column to Message
--    Stores the WhatsApp message ID returned by Meta on send,
--    used to match incoming status webhooks (delivered / read).
-- ============================================================
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "wamid" TEXT;

CREATE INDEX IF NOT EXISTS "Message_wamid_idx"
  ON "Message" ("wamid")
  WHERE "wamid" IS NOT NULL;

-- ============================================================
-- 2. Enable Realtime on Message and Conversation tables
--    REPLICA IDENTITY FULL is required for UPDATE events to
--    carry the full row (needed for status-update filtering).
-- ============================================================
ALTER TABLE "Message"      REPLICA IDENTITY FULL;
ALTER TABLE "Conversation" REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication.
-- The DO block silently skips if already present.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Conversation";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- 3. RLS policy: allow UPDATE on Message (for status changes
--    written by the webhook via the service role — already
--    bypasses RLS, but add a user-facing UPDATE policy too
--    so the realtime UPDATE event passes the SELECT check).
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'Message' AND policyname = 'message_update_own_tenant'
  ) THEN
    CREATE POLICY "message_update_own_tenant"
      ON "Message" FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM "Conversation" c
          WHERE c.id = "Message"."conversationId"
            AND c."tenantId" = public.current_tenant_id()
        )
      );
  END IF;
END $$;
