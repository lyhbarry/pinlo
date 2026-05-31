-- Prevent multiple tenants from connecting the same WhatsApp phone number.
-- The partial index only enforces uniqueness when the column is non-null,
-- so tenants that haven't connected WhatsApp yet are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_whatsappPhoneNumberId_key"
  ON "Tenant" ("whatsappPhoneNumberId")
  WHERE "whatsappPhoneNumberId" IS NOT NULL;
