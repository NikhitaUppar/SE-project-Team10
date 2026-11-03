# [CAMPAIGN] Auto-close campaigns past deadline (FR-10)

Issue: https://github.com/NikhitaUppar/SE-project-Team10/issues/13

Branch: `feature/13-auto-close-campaigns`. The existing `c03728f` implementation
was preserved and integrated with main at `d9c48d1` on 2026-11-02. Main was
updated with `git pull --ff-only origin main` after checking a clean working tree
and fetching/pruning. No destructive reset, force push, or main commit was used.
At initial implementation, issue #12 / PR #39 was unmerged. It is now part of
main and its progress timeline/posting behavior is preserved by the 2026-11-03
conflict resolution. The donor leaderboard remains separate in PR #53.

## Findings before integration

Main registers `node-cron` at `0 0 * * *`, but its close callback is a TODO and
has no explicit timezone. Its donation check bypasses the database in test mode,
ignores lookup failures, and checks status without deadline. Its confirmation and
webhook paths separately read/write raised totals, including on closed campaigns.
The existing issue #13 branch already implemented the lifecycle service, scheduler,
and order restriction. Those were reused instead of creating a second scheduler.
Newer checkout, admin, campaign statistics, sharing, impact, and design changes from
main were retained. Authentication and provider signature rules remain unchanged.

## Acceptance criteria and deadline rules

| Requirement | Implementation |
| --- | --- |
| Daily midnight check | Existing node-cron, `0 0 * * *`, explicit `Asia/Kolkata` default. |
| Expired active rows become closed | One conditional status-only UPDATE where status=active and deadline<cutoff. |
| Closed campaigns cannot accept new donations | Mandatory database check of status/deadline before new orders; unavailable/database-failure requests are blocked. |
| Closed campaigns receive no raised-total credit | Payment reconciliation locks donation/campaign rows and checks eligibility before incrementing totals. |

`CAMPAIGN_CRON_TIMEZONE` accepts an optional valid IANA timezone. Comparisons use
absolute instants and UTC cutoffs; equivalent Z and +05:30 deadlines behave alike.
At exactly the deadline, a campaign is still eligible. One millisecond later it
is expired. Invalid/missing deadlines cannot accept donations.

Only active campaigns are auto-closed. Pending review, rejected, already closed,
and other future terminal states are preserved. Campaign details, files, updates,
financial history, and ownership are not deleted. Multiple expired campaigns are
closed in one atomic operation; repeated/concurrent closure is idempotent.

The application registers the scheduler outside NODE_ENV=test. Registration is
reused if startup is called again for the same scheduler. A startup catch-up
handles downtime. Runs do not overlap; database errors are logged without private
details and the following scheduled invocation can retry. No extra worker or
project dependency was added.

## New orders, capture, and reconciliation

Every create-order call checks the database, including tests/demo payment mode.
Missing campaigns return 404, unavailable campaigns 409, and failed availability
lookups 503. Expired active campaigns are blocked before the next midnight job.
A pending donation must be stored before checkout is offered in configured mode.

Direct verification and captured/paid webhooks share `settle_campaign_payment`.
The transaction locks the donation and campaign, validates the donor for direct
verification, increments the campaign total only while active and unexpired, and
records the captured payment. The order has a unique non-null Razorpay order ID.
Duplicate/reordered callbacks and application restarts cannot double-credit it.
A different payment ID for an already-completed order is rejected. SQL errors
return a retryable 503 and never fall back to non-atomic accounting.

If an existing order is captured after closure/expiry, the financial record still
becomes completed with its provider payment ID, but `campaign_credited=false`.
The campaign total does not increase. The direct API returns
`reconciliation_required=true`; the UI explains that the organiser must reconcile
it. This is not a refund: no automatic refund is invented or claimed. The existing
captured-payment/receipt workflow remains; only first completion dispatches the
receipt. Owner totals/donor count/timeline exclude explicitly uncredited captures.
Historical donation rows retain `campaign_credited=NULL` and their previous meaning.
A late payment.failed event can only update pending rows, never completed ones.

## Frontend

API responses include `accepting_donations` and present expired active campaigns
as closed without writing during GET. Active browsing filters expired rows before
count/pagination. Cards show View Campaign when donations are unavailable. Detail
pages preserve the existing design, sharing/countdown, impact text, documents,
supporter history, and checkout modal; unavailable forms are hidden with an
explanation. A stale page's donation request is still blocked by the backend.

Failed/missing detail requests show a real error instead of a fabricated active
campaign. The payment callback refreshes authoritative totals rather than adding
an optimistic amount to a possibly closed campaign. Verification failures are
shown without claiming success. This branch does not reimplement issue #12.

## Required migration and deployment

**Generated, tested locally, NOT applied to shared Supabase:**
`src/config/migrations/013_campaign_expiry_payments.sql`.

Before deploying this branch, a project administrator must review and execute
that file in Supabase SQL Editor using the existing schema. It adds a nullable
`donations.campaign_credited` flag, a unique partial order-ID index, and the
service-role-only settlement function. It does not delete/relabel historical rows.
If duplicate historical order IDs exist, index creation fails and the transaction
rolls back; investigate those records rather than deleting them. A read-only
preflight can identify them:

```sql
SELECT razorpay_order_id, COUNT(*)
FROM public.donations
WHERE razorpay_order_id IS NOT NULL
GROUP BY razorpay_order_id HAVING COUNT(*) > 1;
```

The isolated PostgreSQL tests apply the real migration and confirm that reapplying
it preserves historical data and ordinary authenticated roles cannot execute it.
For administrator reconciliation, query completed donations with
`campaign_credited IS FALSE`. Do not rerun schema.sql on an existing database.

Existing Supabase campaign/donation fields were confirmed with zero-row read-only
queries (HTTP 200). No remote migration, shared writes, real payment, or email was
used during this task. Both private .env files are preserved and ignored.

The in-process schedule needs an always-running backend. Sleeping/serverless
hosting needs a durable external scheduler. Normal startup with real configuration
performs catch-up against that database; no live startup was used for expiry tests.
Run the migration before starting the new backend/payment handlers. If it is
missing, payment reconciliation fails safely rather than bypassing the rule.

## Files added or updated relative to main

Paths are relative to micro-donation-platform except the two root documents.

| File | Purpose |
| --- | --- |
| backend/src/services/campaignLifecycle.js | Status/deadline policy, effective presentation, atomic expiry update. |
| backend/src/jobs/campaignExpiryJob.js | Explicit midnight timezone, catch-up, duplicate/overlap guard, retry handling. |
| backend/src/services/paymentSettlement.js | Shared service-role RPC for verify and webhook accounting. |
| backend/src/config/migrations/013_campaign_expiry_payments.sql | Atomic settlement, uncredited capture marker, unique order IDs. |
| backend/src/index.js | Wires the existing scheduler implementation into startup. |
| backend/src/controllers/campaignController.js | Expiry-aware list/detail and consistent owner fundraising totals. |
| backend/src/controllers/donationController.js | Mandatory order eligibility; atomic capture reconciliation and retry responses. |
| backend/.env.example | Optional cron timezone documentation. |
| frontend/src/components/campaign/CampaignCard.jsx | Unavailable campaign action label. |
| frontend/src/pages/CampaignDetail.jsx | Closed-state donation UI and authoritative payment totals. |
| backend/tests/campaignLifecycle.test.js | Deadline/status, safe closure, mandatory order checks, API policy. |
| backend/tests/campaignExpiryJob.test.js | Midnight, timezone, startup catch-up, duplicates, overlap, retry. |
| backend/tests/campaignExpiryStartup.test.js | Development/production startup wiring, no scheduler in tests. |
| backend/tests/campaignExpiry.integration.test.js | Runs isolated PostgreSQL scenarios through Jest. |
| backend/tests/campaignExpiry/fixture.cjs | Isolated PostgreSQL and real-route/Supabase adapter; no .env. |
| backend/tests/campaignExpiry/flow.cjs | SQL expiry/preservation, HTTP restrictions, signed payment callbacks, retries and migration. |
| backend/tests/campaignExpiry/browser.cjs | Closed/future UI, stale-page order rejection, reload and browsing. |
| backend/tests/campaignController.test.js | Updated browse mocks for deadline filtering. |
| backend/tests/razorpay.test.js | Actual future-active fixture for mandatory eligibility checks. |
| backend/tests/authDonation.integration.test.js | Campaign projection/deadline in existing auth/donation fixture. |
| backend/tests/campaignStats.test.js | Excludes uncredited late captures from owner totals and timeline. |
| backend/ISSUE_13_AUTO_CLOSE.md | Review, deployment/migration, validation, and PR draft. |
| Root README.md | Link to this feature guide. |
| Root CHANGELOG.md | Record of issue #13 integration and verification. |

## Actual validation on 2026-11-02

- Direct PostgreSQL suite: **21/21 passed**. Exercises the real migration, expiry
  SQL, UTC/offset/exact boundaries, status preservation, multiple/concurrent runs,
  audit trail, real routes/JWTs, signed verify/webhooks, no late credit, retries,
  persisted idempotency after cache reset, failed webhook ordering, and permissions.
- Frontend production build passed.
- Isolated Chrome passed: closed state before persistence, hidden donation form,
  initially eligible future campaign, stale-page backend rejection, persisted
  closure after reload, and browsing filtering. Selectors were updated for the
  current checkout button instead of the previous Razorpay button label.
- Full backend run: **247 passed / 12 failed**, **20 suites passed / 1 failed**.
  All 12 failures are the inherited login failures documented below; the expiry,
  payment, campaign, and other existing suites passed. This includes the Jest
  wrapper for the 21 child PostgreSQL scenarios.
- No configured lint script/ESLint configuration exists. PR diff whitespace check
  is used instead. No private keys or environment files belong in the PR diff.

Main contains an authentication shortcut for UUID
`11111111-1111-1111-1111-111111111111`. An untouched archived copy of main at
`d9c48d1` independently reproduced **12 failed / 28 passed login tests**. The
shortcut bypasses database/session checks for that UUID. This issue #13 branch
does not alter auth middleware or login tests, and does not claim the full suite
is green. That regression needs separate attention before merge. Existing
provider demo-signature/test-mode behavior is also preserved, not redesigned.

## Prepared pull request

Title: **[CAMPAIGN] Auto-close campaigns past deadline (FR-10)**

Closes #13

Campaigns past their deadline immediately stop accepting new donation orders and
are persisted as closed at midnight in Asia/Kolkata, with startup catch-up. Safe
conditional updates retain existing records. Public API/UI rules match the
scheduler, including before the nightly run.

Verify and webhook callbacks use a row-locked PostgreSQL transaction to prevent
double credit and preserve captures arriving after closure without increasing the
closed campaign total. These are marked for administrator reconciliation. The
required 013 migration is generated/tested and has not been applied remotely.

Validation: 21 PostgreSQL scenarios, scheduler/startup/unit checks, frontend build,
and isolated Chrome checks passed. Full backend: **247 passed / 12 failed**,
with all failures independently reproduced on main in the login suite. No new dependency or secret is included.

Push and PR creation require the user's confirmation. Never merge automatically.


## 2026-11-03: PR #52 conflict resolution

Integrated main `8816d6d` into the existing PR branch. Resolved README, CHANGELOG,
and CampaignDetail conflicts. Kept both feature guides/change histories, main's
real campaign error screen and request cancellation, merged progress timeline,
owner form, new campaign-start navigation, and video uploads. Expiry scheduling,
API eligibility, transactional payment reconciliation, and unavailable donation
controls remain intact. No new migration or production behavior was added by
this conflict fix; the already documented 013 migration is still required and
has not been applied to shared Supabase.

Extended the isolated expiry fixture to serve progress reads and the browser
check to confirm history remains visible on an expired campaign. Both Chrome
walkthroughs passed: expiry/stale-page restrictions/reload/browse, plus owner
posting, chronology, validation, retries, persistence, reader restrictions,
closed/missing campaigns, mobile layout, sharing, and impact text. Frontend build
passed. Full backend: **248 passed / 12 failed**, **21 suites passed / 1 failed**.
All failures are in the unchanged inherited login suite; expiry, settlement, and
progress integration checks passed. The earlier 247 result above is historical.

Follow-up edits: README.md, CHANGELOG.md, CampaignDetail.jsx, this guide, and the
expiry browser/fixture files; main's merged files are retained. No private .env
changes, shared database writes, real payments, or emails were used.
