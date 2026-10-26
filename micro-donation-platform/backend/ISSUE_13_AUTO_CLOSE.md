# [CAMPAIGN] Auto-close campaigns past deadline (FR-10)

Issue: <https://github.com/NikhitaUppar/SE-project-Team10/issues/13>

Branch: `feature/13-auto-close-campaigns`, based on updated `main` at `509d358`.
The working tree was clean before fetching, switching to main, pulling with
`--ff-only`, and creating this branch. Issue #12's branch/PR was preserved:
it is unmerged and is not a dependency of this implementation.

## Actual acceptance criteria

| Criterion | Implementation |
| --- | --- |
| Cron job runs daily at midnight | Existing `node-cron` schedules `0 0 * * *` in `Asia/Kolkata` by default; application startup wires the job in development/production. |
| Expired campaigns set to `closed` | One conditional SQL update changes only `active` campaigns with `deadline < cutoff` to the existing `closed` status. |
| Closed campaigns no longer accept donations | Every new donation order checks current status and deadline before creating a payment order. Database lookup failures also block the operation. The UI uses the backend's `accepting_donations` flag. |

## Deadline and status rules

The existing schema uses a `TIMESTAMPTZ` deadline and these campaign statuses:
`pending_review`, `active`, `rejected`, and `closed`. These existing values are
centralized in `campaignLifecycle.js`; no new status or schema migration is added.
There is no `cancelled` status in the current schema. The expiry update is restricted
to `active`, so all non-active statuses remain unchanged, including any future
terminal status the project may add.

The boundary is strict: a deadline **earlier than** the check time has passed.
At exactly the same instant, the campaign is not expired yet. The scheduler
and API both use this rule. JavaScript compares absolute instants; the database
receives a UTC ISO cutoff and compares timezone-aware timestamps. Equivalent
`Z` and `+05:30` dates refer to the same deadline.

The write changes only campaign `status`. Campaign stories, ownership, goals,
raised totals, donations, files, progress updates, and their relationships stay
intact. Repeated/concurrent runs do not repeat state changes: already-closed
rows no longer match the update predicate. Each process also avoids overlapping
job executions. Database errors are contained, logged without private details,
and retried on the next daily invocation.

## Automatic execution and deployment

The existing backend entrypoint starts the job outside `NODE_ENV=test`.
It immediately performs a catch-up check after startup, then runs daily at
midnight. This catches campaigns that expired while the process was stopped.

`CAMPAIGN_CRON_TIMEZONE` is optional. Its default is `Asia/Kolkata`, matching the
India-focused project. Set it to another valid IANA timezone, such as `UTC`,
only if the deployment needs a different definition of midnight. An invalid
timezone is rejected instead of silently using the host's local timezone.
The environment example documents this setting; private `.env` files are unchanged.

No database migration, new dependency, external cron configuration, or manual
admin closure is required for the existing long-running Node deployment.
The backend needs its existing Supabase service key and permission to update
campaigns. Run it continuously on the VM/container, with restart-on-failure
configured by the deployment process. Sleeping or request-only serverless
hosting cannot guarantee an in-process midnight job; it would need a durable
external scheduler. Multiple running replicas are safe for the conditional,
idempotent database update, though they may each log a check.

**Starting `npm.cmd run dev` or `npm.cmd start` with the real backend configuration
will now perform the intended expiry catch-up against that configured database.**
During implementation, the live shared backend was stopped; all closure/write
verification used isolated test databases. No shared campaigns were closed as
part of automated testing.

## API, UI, and existing-feature integration

There can be time between an individual deadline and the next midnight job.
To avoid accepting donations during that gap:

- Active browsing filters out expired rows in Supabase before pagination/counts.
- Campaign detail/read responses present an expired active campaign as closed
  and include `accepting_donations: false`. GET requests do not write status.
- Donation creation checks the same lifecycle policy unconditionally, including
  in demo/test mode. It returns 409 for unavailable campaigns, 404 for a missing
  campaign, or 503 for a failed availability lookup, before payment-order creation.
- The detail page hides the donation form when the API disallows donations.
  A stale page is still blocked by the backend if its deadline passed after loading.
- Campaign cards use the API flag for their action label; unavailable campaigns
  link to their history as **View Campaign** instead of **Donate Now**.

Existing campaign creation still creates `pending_review` rows. Expiry does not
approve, reject, or close pending campaigns. Listing/detail statistics and records
are preserved. Issue #12 is not implemented or rewritten here; after it merges,
its existing status check prevents owner progress posts on persisted closed
campaigns and its UI receives the effective closed status from detail responses.

Payment confirmation and webhooks for already-issued orders are unchanged.
They must still record payments the provider has actually captured; expiry must
not discard financial records or invent refunds. FR-10 blocks **new order creation**.

## Changed files

Paths below are relative to `micro-donation-platform`, except the two root docs.

| File | Purpose |
| --- | --- |
| `backend/src/services/campaignLifecycle.js` | Shared statuses, expiry/availability policy, effective presentation, atomic close operation. |
| `backend/src/jobs/campaignExpiryJob.js` | Midnight scheduling, explicit timezone, startup catch-up, overlap guard, safe failure/retry. |
| `backend/src/index.js` | Connects the real job to app startup, replacing the TODO callback. |
| `backend/src/controllers/campaignController.js` | Filters expired active listings, presents effective detail status, delegates the legacy close helper. |
| `backend/src/controllers/donationController.js` | Mandatory fail-closed availability check before new payment orders. |
| `backend/.env.example` | Documents the optional cron timezone. |
| `frontend/src/components/campaign/CampaignCard.jsx` | Uses the availability flag for status styling and action labels. |
| `frontend/src/pages/CampaignDetail.jsx` | Uses backend permission to block the donation form and submission. |
| `backend/tests/campaignController.test.js` | Adds the deadline-filter operation to existing browsing mocks. |
| `backend/tests/razorpay.test.js` | Supplies an actual active/future campaign fixture now that availability is always checked. |
| `backend/tests/campaignLifecycle.test.js` | Date boundary, offsets, status preservation, atomic predicate, API availability, and fail-closed tests. |
| `backend/tests/campaignExpiryJob.test.js` | Midnight matcher/timezone, startup catch-up, configurable timezone, overlap, failure/retry. |
| `backend/tests/campaignExpiryStartup.test.js` | Verifies the app wires the scheduler in development/production and disables it in tests without opening real listeners. |
| `backend/tests/campaignExpiry.integration.test.js` | Runs the PostgreSQL/real-route scenarios through Jest. |
| `backend/tests/campaignExpiry/fixture.cjs` | Isolated PostgreSQL, real JWT/Supabase-client test adapter, and production routes. |
| `backend/tests/campaignExpiry/flow.cjs` | Actual SQL closure, idempotency/audit, preservation, API restrictions, and regressions. |
| `backend/tests/campaignExpiry/browser.cjs` | Optional Chrome checks for closed/future campaigns and stale-page donation rejection. |
| `backend/ISSUE_13_AUTO_CLOSE.md` | Rules, file review, deployment, validation evidence, and prepared PR description. |
| Root `README.md` | Links this feature guide. |
| Root `CHANGELOG.md` | Records implementation and validation. |

## Verification completed on 2026-10-26

- `npm.cmd test -- --runInBand` in backend: **17 suites / 210 Jest tests passed**.
  The new integration wrapper runs **10 additional child PostgreSQL scenarios**.
- Direct `node --test tests/campaignExpiry/flow.cjs`: **10/10 passed**. Verifies
  only eligible rows close, exact boundary, offset timestamps, future/terminal
  preservation, concurrent/repeated calls, an audit trigger with no duplicate
  transitions, related-row preservation, startup/scheduled callbacks, failure
  recovery, closed-order rejection, browsing counts, and creation review status.
- Scheduler unit checks exercise the installed cron's timezone-aware midnight
  matcher, and entrypoint tests verify real startup wiring.
- `npm.cmd run build` in frontend: passed.
- Optional headless Chrome: expired detail hides donation controls before the
  daily persistence, future detail allows donation controls, backend rejects an
  expired request from a stale page, persisted closure survives reload, and
  browsing keeps future campaigns while excluding expired ones: all passed.
- Existing auth, receipt, payment verification, campaign creation/upload, and
  browsing checks passed. No real payments or emails were sent.
- No lint script/ESLint configuration exists; no lint run is claimed.
  Patch whitespace is checked with `git diff --check`.

Tests do not load the real `.env`; fixtures create temporary local PostgreSQL
and test JWTs, and payment creation uses the existing test simulation. No new
project dependencies or private credentials are required by the tests.

For the optional browser runner, start only the frontend on localhost:5173.
Set `PLAYWRIGHT_MODULE_PATH` to a separate Playwright Core installation, and
`CHROME_PATH` if Chrome is not installed at its usual Windows path, then run
`node tests/campaignExpiry/browser.cjs` from backend. API calls are intercepted
and sent to the isolated fixture, not the shared backend.

## Prepared PR description

Title: **[CAMPAIGN] Auto-close campaigns past deadline (FR-10)**

Closes #13

Campaigns whose deadline has passed stop accepting new donations, disappear from
active browsing, and are persisted as `closed` by the daily midnight job. The
existing node-cron scheduler now runs in Asia/Kolkata (configurable) with startup
catch-up. A single conditional status-only update preserves related records and
is safe to repeat.

Shared lifecycle rules define the strict deadline boundary and keep API/UI
availability consistent before the midnight run. Donation creation fails closed
when availability cannot be checked, including in demo/test mode. Existing
confirmation/webhook bookkeeping is preserved for already-issued payments.

Changed files and their purposes are listed above. Validation: 210 Jest tests,
10 PostgreSQL scenarios, cron/startup checks, frontend build, and isolated Chrome
checks passed. No migration, new dependency, secret, or shared test write is included.
Deployment needs an always-running backend; restarting it performs catch-up.

Issue #12 remains an independent unmerged PR. This PR targets `main`, does not
close the issue manually, and is not authorized for automatic merge.
