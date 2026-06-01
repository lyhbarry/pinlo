/**
 * E2E tests — teammate invite feature
 *
 * Pre-requisites:
 *   1. App running at http://localhost:3000 (or BASE_URL env)
 *   2. Two test accounts seeded in the DB:
 *       OWNER_EMAIL / OWNER_PASSWORD  — OWNER role
 *       MEMBER_EMAIL / MEMBER_PASSWORD — MEMBER role (same tenant)
 *   3. npx playwright install chromium  (first time only)
 *
 * Run:
 *   npx playwright test e2e/team-invite.spec.ts
 */

import { test, expect, Page } from "@playwright/test";

// ─── Config — override via env vars ──────────────────────────────────────────

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "password123";
const MEMBER_EMAIL = process.env.MEMBER_EMAIL ?? "member@example.com";
const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD ?? "password123";
const INVITE_EMAIL = process.env.INVITE_EMAIL ?? `invite+${Date.now()}@example.com`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/dashboard/);
}

async function openSettingsTeamCard(page: Page) {
  await page.goto("/dashboard/settings");
  // Wait for the Team card to load (members list settled)
  await page.waitForSelector("text=Team");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Teammate invite — happy path", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
  });

  test("Invite button is visible to OWNER", async ({ page }) => {
    await openSettingsTeamCard(page);
    await expect(page.getByRole("button", { name: /invite/i })).toBeVisible();
  });

  test("Invite form appears after clicking Invite", async ({ page }) => {
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();
    await expect(page.getByPlaceholder(/colleague@example.com/i)).toBeVisible();
  });

  test("Can send an invite — success toast shown and member added to list", async ({ page }) => {
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();

    await page.getByPlaceholder(/colleague@example.com/i).fill(INVITE_EMAIL);
    // Role defaults to Member — leave as-is
    await page.getByRole("button", { name: /send invite/i }).click();

    // Toast confirming the invite
    await expect(page.getByText(`Invite sent to ${INVITE_EMAIL}`)).toBeVisible();

    // Invited user email should appear in the member list
    await expect(page.getByText(INVITE_EMAIL)).toBeVisible();
  });

  test("Can invite as Admin role", async ({ page }) => {
    const adminEmail = `admin+${Date.now()}@example.com`;
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();

    await page.getByPlaceholder(/colleague@example.com/i).fill(adminEmail);
    await page.getByRole("combobox").selectOption("ADMIN");
    await page.getByRole("button", { name: /send invite/i }).click();

    await expect(page.getByText(`Invite sent to ${adminEmail}`)).toBeVisible();
    // Role badge should show "admin"
    await expect(page.locator(`text=${adminEmail}`).locator("..").getByText("admin")).toBeVisible();
  });

  test("Send invite button is disabled when email field is empty", async ({ page }) => {
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();
    await expect(page.getByRole("button", { name: /send invite/i })).toBeDisabled();
  });

  test("Pressing Enter in email field submits the invite", async ({ page }) => {
    const email = `enter+${Date.now()}@example.com`;
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();

    await page.getByPlaceholder(/colleague@example.com/i).fill(email);
    await page.getByPlaceholder(/colleague@example.com/i).press("Enter");

    await expect(page.getByText(`Invite sent to ${email}`)).toBeVisible();
  });

  test("Cancel button hides the invite form", async ({ page }) => {
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();
    await expect(page.getByPlaceholder(/colleague@example.com/i)).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/colleague@example.com/i)).not.toBeVisible();
  });
});

test.describe("Teammate invite — error cases", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
  });

  test("Shows error toast when inviting an already-existing member", async ({ page }) => {
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();

    // Invite a user who is already a member
    await page.getByPlaceholder(/colleague@example.com/i).fill(OWNER_EMAIL);
    await page.getByRole("button", { name: /send invite/i }).click();

    await expect(page.getByText(/already a member/i)).toBeVisible();
  });
});

test.describe("Teammate invite — permission checks", () => {
  test("MEMBER cannot see the Invite button", async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await openSettingsTeamCard(page);

    await expect(page.getByRole("button", { name: /invite/i })).not.toBeVisible();
  });
});

test.describe("Teammate invite — plan limit", () => {
  // This test requires a free-plan tenant already at 5 members.
  // Skip in CI unless OVER_LIMIT_EMAIL is set.
  test.skip(!process.env.OVER_LIMIT_EMAIL, "Requires OVER_LIMIT_EMAIL env (free plan at capacity)");

  test("Shows upgrade toast when free plan user limit is reached", async ({ page }) => {
    await login(page, process.env.OVER_LIMIT_EMAIL!, process.env.OVER_LIMIT_PASSWORD!);
    await openSettingsTeamCard(page);
    await page.getByRole("button", { name: /invite/i }).click();

    await page.getByPlaceholder(/colleague@example.com/i).fill(`overflow+${Date.now()}@example.com`);
    await page.getByRole("button", { name: /send invite/i }).click();

    await expect(page.getByText(/5-member limit|user limit reached/i)).toBeVisible();
    // Should show an "Upgrade" action in the toast
    await expect(page.getByRole("button", { name: /upgrade/i })).toBeVisible();
  });
});
