# Manual Test Checklist — Teammate Invite

Use this alongside the automated tests for anything that needs real email delivery or Supabase auth state.

---

## Setup

- [ ] App running at `localhost:3000`
- [ ] Supabase project connected (check `.env.local`)
- [ ] You have an **OWNER** account you can log in with
- [ ] You have a real inbox you can receive invite emails on (or use Inbucket / Mailpit for local)

---

## 1. Happy path — invite a new user

| # | Step | Expected |
|---|------|----------|
| 1 | Log in as OWNER → Settings → Team | "Invite" button visible in Team card header |
| 2 | Click Invite | Email input + role dropdown appear |
| 3 | Enter a valid email not in the workspace | Input accepts it, Send button enabled |
| 4 | Leave role as "Member", click Send invite | Toast: "Invite sent to <email>" |
| 5 | Check the members list immediately after | Invited email appears with "member" badge |
| 6 | Check the inbox for the invite email | Email arrives with a set-password link |
| 7 | Click the set-password link | Redirects to `/set-password` |
| 8 | Set a password and submit | Redirected into the dashboard as the new user |
| 9 | Log out, log back in with new credentials | Login succeeds |

---

## 2. Invite as Admin role

| # | Step | Expected |
|---|------|----------|
| 1 | Click Invite, enter email, change role dropdown to **Admin** | "admin" visible in dropdown |
| 2 | Click Send invite | Toast success |
| 3 | Check member list | Email appears with **admin** (blue) badge |
| 4 | Log in as that new user | They can see the Invite button in Settings |

---

## 3. Input validation

| # | Step | Expected |
|---|------|----------|
| 1 | Open invite form, leave email blank | Send invite button is **disabled** |
| 2 | Enter only spaces | Send invite button remains **disabled** |
| 3 | Type a valid email, then clear it | Button goes back to disabled |
| 4 | Enter a valid email, press **Enter** | Invite sent (same as clicking button) |

---

## 4. Duplicate invite

| # | Step | Expected |
|---|------|----------|
| 1 | Try to invite an email already in the members list | Toast error: "This user is already a member of your workspace." |
| 2 | Member list unchanged | No duplicate row added |

---

## 5. Cancel / dismiss

| # | Step | Expected |
|---|------|----------|
| 1 | Click Invite, then click Cancel | Form disappears, email field cleared |
| 2 | Click Invite again | Fresh empty form |

---

## 6. Permission checks

| # | Step | Expected |
|---|------|----------|
| 1 | Log in as a **MEMBER** → Settings → Team | No "Invite" button visible |
| 2 | (API) `POST /api/team` as a MEMBER (e.g. via curl with MEMBER session cookie) | `403 Forbidden` |
| 3 | Log in as an **ADMIN** | Invite button is visible and works |

---

## 7. Free plan — user limit (5 members)

| # | Step | Expected |
|---|------|----------|
| 1 | With exactly 5 members on a free plan, try to invite a 6th | Toast error: "You've reached the 5-member limit on the free plan." with **Upgrade** action button |
| 2 | Click Upgrade in the toast | Navigates to billing/checkout |
| 3 | After upgrading to Pro, retry the invite | Invite succeeds |

---

## 8. Remove a member (related — verify invite list stays clean)

| # | Step | Expected |
|---|------|----------|
| 1 | Click the trash icon next to a MEMBER | Confirmation via toast, row removed |
| 2 | OWNER cannot see trash icon next to themselves | Correct — self-removal blocked in UI |
| 3 | ADMIN cannot remove the OWNER | Trash icon not shown next to OWNER for ADMIN |

---

## 9. Edge cases

| # | Step | Expected |
|---|------|----------|
| 1 | Invite with mixed-case email (`ALICE@Example.COM`) | Stored and sent as `alice@example.com` |
| 2 | Invite with leading/trailing spaces (`  bob@example.com  `) | Trimmed, invite succeeds |
| 3 | Supabase SMTP down (simulate by disabling email in Supabase dashboard) | Toast error: "Failed to send invite." (500 response), no User row inserted |
| 4 | Refresh the page after a successful invite | New member still in the list (persisted) |
