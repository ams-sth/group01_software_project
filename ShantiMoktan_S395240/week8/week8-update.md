# Week 8 — Shanti (Tester/DBA)

Closed out backend coverage gaps left by the newer features (receipts, notifications), then added a full Cypress e2e test scripts for the frontend.

**Backend**
- `splitsync/server.Tests/Integration/Expenses/ExpensesEndpointTests.cs` — expense edit/delete, payer-only permission checks
- `splitsync/server.Tests/Integration/Notifications/NotificationsEndpointTests.cs` — new, covers the notifications feature end to end (unread count, mark read, mark all read)
- Known gap: `GET /api/groups/{id}/member-candidates` uses a Postgres-only `EF.Functions.ILike` call, so it can't be covered by the in-memory test database — confirmed this 500s under InMemory, flagged rather than faked

**Frontend (Cypress)** — `splitsync/client/cypress/e2e/`, one folder per module:
- `auth/` — sign up, sign in, wrong password, sign out, delete account
- `groups/` — create, join by ID, rename, delete, leave, add/remove member
- `expenses/` — equal-split expense, unequal-split validation, edit, delete
- `settlements/` — recording a settlement clears the balance
- `notifications/` — unread badge, dropdown, mark all read
- `support/testApi.ts` — shared helper that registers users and seeds groups/expenses directly against the real API, so each spec starts from clean state without duplicating setup steps

Removed the leftover `counter.cy.ts` (stale Vite template test, didn't match any real page).

Note: couldn't run Cypress myself in this environment (its Electron binary won't launch here even after a clean reinstall) — specs are typechecked and every API call they depend on was verified directly against the live backend, but they still need a first real run.
