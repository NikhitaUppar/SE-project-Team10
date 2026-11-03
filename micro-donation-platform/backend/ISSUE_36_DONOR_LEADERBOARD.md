# Issue #36: [UI] Donor leaderboard on campaign page

Issue: https://github.com/NikhitaUppar/SE-project-Team10/issues/36

Branch: `feature/36-donor-leaderboard`, created from updated main `d9c48d1`.
Before editing: checked status/branches, fetched with prune, fast-forwarded main
with `git pull --ff-only origin main`, and preserved the issue #12/#13 branches.
At initial implementation, PR #39 and PR #52 were open and unmerged. PR #39
has since merged into main and is preserved by the 2026-11-03 integration below.
Issue #13 remains separate; neither feature was reimplemented here.

## Acceptance criteria

| Requirement | Implementation |
| --- | --- |
| Top Donors on campaign detail, top five by amount | New CampaignDonors component renders five ranked entries from completed contributions. |
| Public name or Anonymous, and amount | Explicit public response projection; anonymous names masked; INR formatting preserves paise. |
| Descending amounts | Totals per public donor identity, sorted by exact accumulated paise descending with stable internal ID tie-break. |
| GET /api/campaigns/:id/donors | Public route validates UUID and campaign existence, then returns top_donors and recent_donations. |
| Last five donations with time ago below leaderboard | Recent Donations follows Top Donors, ordered created_at DESC then ID ASC. Relative labels refresh every minute without another API request. |

## API and aggregation rules

Success response:

```json
{
  "top_donors": [
    {"rank":1,"donor_name":"Supporter","amount":300.25,"is_anonymous":false}
  ],
  "recent_donations": [
    {"id":"donation-uuid","donor_name":"Anonymous","amount":50,"is_anonymous":true,"created_at":"2030-01-01T12:00:00Z"}
  ]
}
```

Both arrays have at most five entries; empty histories return empty arrays.
Invalid IDs return 400, nonexistent campaigns 404, database errors 500 with a
safe retry message. No authentication is needed for these public donor summaries.
Campaign details and other API routes retain their existing behavior.

The existing schema stores donation amounts in rupees as NUMERIC(10,2), with
campaign_id, donor_id, status, is_anonymous, created_at, and Razorpay identifiers.
Only completed rows are queried; pending/failed/refunded/cancelled records are
excluded. Distinct successful payments from one named donor are aggregated.
Integer paise (BigInt internally) prevent floating-point accumulation errors.

Anonymous contributions are grouped under a separate internal identity per donor
and always display Anonymous. They are never added to that donor's named total,
so a public name cannot reveal private gift amounts. The response exposes no
user IDs or links between anonymous and named identities. Missing/deleted users
are displayed as Donor and their unrelated gifts are not merged into one person.
Different accounts sharing a display name remain separate ranked supporters.

Repeated row IDs, order IDs, or payment IDs count once. A record connecting an
order-only duplicate to a payment-only duplicate merges those copies as well.
If any duplicate copy requests anonymity, the public result remains anonymous.
The newest canonical copy is used deterministically. No payment row is modified.
Rows explicitly marked campaign_credited=false are excluded if the later issue
#13 migration is present, without requiring that optional column on current main.

Only names, amounts, anonymity flags, ranks, donation IDs, and timestamps are
returned. Internal donor/provider identifiers and any email/password fields are
never spread into the response. React renders display names as text.

## Query and dependency choices

No database migration, schema change, new package, or environment change is
required. The service uses the existing Supabase client and relationship to
users(display_name). Donation rows are fetched in keyset pages ordered by their
unique UUID, rather than silently truncating at Supabase's default 1000-row limit
or using shifting offsets. Typical small campaigns use one donation query plus
one campaign-existence lookup. Top/recent results share that data read.

Aggregation runs on the backend, not in the browser. Work scales with the number
of completed records; a high-volume deployment could later move aggregation into
a SQL function/materialized view. Separate page reads are eventually consistent
if donations are added or edited during a request; a refresh sees subsequent
changes. Provider-key deduplication prevents counting repeated rows/payments.
The implementation adds no worker, polling request, or duplicate history fetch.

No date-fns dependency is installed. Existing Intl browser APIs format INR and
relative times, including Just now, minutes/hours ago, Yesterday, days ago, and
future dates. Invalid or missing dates display Date unavailable. Relative text
updates each minute with a local timer.

## UI integration

The old Recent Supporters block is replaced by the reusable CampaignDonors
section using the existing orange palette and React/Tailwind styles. It includes
rank badges, public names, rupee amounts, recent timestamps, empty/loading/error
states, and retry. Requests are cancelled when the campaign changes/unmounts.
A narrow-screen minWidth fix prevents long names from widening the parent grid.

After a successful existing verification response, the component rereads completed
records. It does not invent a donor entry from checkout input. Checkout/payment
verification logic, authentication, raised-total behavior, sharing, countdown,
impact information, documents, and the existing campaign layout remain outside
this issue's changes. The legacy /donations endpoint is preserved for consumers.
The feature preserves merged progress updates and does not implement the separate
expiry feature.

## Changed files

Paths relative to micro-donation-platform, except the two root documents.

| File | Purpose |
| --- | --- |
| backend/src/controllers/campaignDonorsController.js | Validates campaign IDs/existence and returns safe donor summaries. |
| backend/src/services/campaignDonors.js | Reads completed records with keyset paging, deduplicates, aggregates, masks names, and projects public fields. |
| backend/src/routes/campaigns.js | Adds the public GET /:id/donors endpoint. |
| frontend/src/components/campaign/CampaignDonors.jsx | Top Donors and Recent Donations, responsive ranks, states/retry, and refreshed relative labels. |
| frontend/src/utils/donationDisplay.js | INR and safe relative timestamp formatting using Intl. |
| frontend/src/pages/CampaignDetail.jsx | Integrates the component, removes duplicate old history state/query, and refreshes donor data after verification. |
| backend/tests/campaignDonors.test.js | Aggregation, decimals, anonymity, deduplication including bridging copies, states, ties, paging, errors, and privacy. |
| backend/tests/donorLeaderboard.integration.test.js | Jest wrapper for PostgreSQL and frontend formatting scenarios. |
| backend/tests/donorLeaderboard/fixture.cjs | Isolated PostgreSQL, Supabase REST adapter, real production routes, and local test data. |
| backend/tests/donorLeaderboard/flow.cjs | Actual SQL/API tests, statuses, privacy, empty/missing IDs, duplicate records, failures, and 1005 rows. |
| backend/tests/donorLeaderboard/display.cjs | Real frontend date/INR utility tests with a fixed clock and malformed/future dates. |
| backend/tests/campaignUpdates/browser.cjs | Scopes existing progress walkthrough checks to the new Recent Donations section. |
| backend/tests/donorLeaderboard/browser.cjs | Isolated Chrome tests for the real React UI, states/retry, anonymity, long names/mobile, and existing controls. |
| backend/ISSUE_36_DONOR_LEADERBOARD.md | Requirements, rules, file review, validation, and prepared PR description. |
| Root README.md | Link to this feature guide. |
| Root CHANGELOG.md | Records issue #36 implementation and verification. |

## Validation on 2026-11-02

- PostgreSQL + frontend formatting: **13/13 passed**, including actual keyset
  paging over 1005 records, public API privacy, and exact INR/relative labels.
- Isolated Chrome passed: loading; top/recent limit and ranking; INR; time ago;
  anonymity; escaped HTML; sharing and donation controls; one history request;
  long-name layout at 390px; safe API errors/retry; empty states and persistence.
- Frontend `npm.cmd run build`: passed.
- Full backend: **234 passed / 12 failed**, **18 suites passed / 1 failed**.
  All failures are in unchanged tests/login.test.js; new leaderboard tests and
  existing campaign, donor dashboard, and payment suites passed. The 13 child
  PostgreSQL/formatting scenarios run through the integration wrapper.
- No lint script/ESLint configuration exists. Patch whitespace and staged-file
  review are required before commit. No real payments/emails, shared database
  writes, or private .env configuration were used in testing.

Current main has 12 known login-test failures from the hard-coded auth shortcut
for UUID 11111111-1111-1111-1111-111111111111. This was independently reproduced
on untouched main during the preceding issue #13 work. Auth middleware and login
tests are unchanged here. Do not report those tests as passing or weaken them.

Optional browser check: run the frontend on localhost:5173, set
PLAYWRIGHT_MODULE_PATH to a separate playwright-core installation, and run
`node tests/donorLeaderboard/browser.cjs` from backend. All API calls are
intercepted and sent to the temporary PostgreSQL fixture, not shared Supabase.

## Prepared PR description

Title (explicitly requested): **[UI] Add Donor Leaderboard on Campaign Page (#36)**

Closes #36

Campaign detail pages show the top five supporters by completed contribution total
and the five latest completed donations with relative times. The new public API
aggregates real donation records, preserves anonymity, avoids duplicate payment
counts, returns only safe public fields, and handles empty/error cases.

Replaces the old supporters block with a responsive ranked list and recent
history using existing styling, loading/retry states, INR formatting, and local
relative-time updates. Completed data is refreshed after existing verification.
No payment/authentication flow, dependency, migration, or environment change.

Validation: PostgreSQL/formatting 13/13, isolated Chrome, and frontend build passed.
Full backend: **234 passed / 12 failed**, with all failures inherited from the
unchanged main login suite. No full-green claim is made.

Branch: feature/36-donor-leaderboard; base: main. Commit message:
`feat(ui): add donor leaderboard to campaign page (#36)`.
Ask the user before pushing or creating this PR. Never merge automatically.


## 2026-11-03: resolve PR #53 conflicts with updated main

Integrated main `8816d6d` into this branch after fetching a clean worktree. PR #39
is now merged into main, along with campaign-start navigation and video uploads.
Resolved overlapping README/change-record additions, campaign route imports, and
campaign detail state/component sections. Preserved the real campaign error state,
request cancellation, CampaignUpdates timeline and posting form, the leaderboard,
new start links, upload changes, sharing/countdown, and checkout controls.

The former Recent Supporters block stays replaced by Top Donors/Recent Donations;
there is no duplicate history request. Both feature guide links and both histories
are retained. This follow-up makes no authentication or payment-controller change.

Validation: **235 backend tests passed / 12 failed**, **19 suites passed / 1 failed**.
All failures are the unchanged inherited login tests. Frontend build passed. The
leaderboard Chrome checks passed with an added assertion that the progress
section remains visible. Progress-update browser selectors are scoped to the new
recent-donations list so duplicate visible donor names do not produce false
strict-selector failures. Both browser walkthroughs passed, including owner posting, chronology, reload
persistence, validation/errors, reader roles, inactive/missing campaigns, and
mobile layout. All browser fixtures use isolated PostgreSQL.

Modified follow-up files: README.md, CHANGELOG.md, backend campaign routes,
frontend CampaignDetail.jsx, this guide, leaderboard browser/fixture files, and
campaignUpdates/browser.cjs. No .env changes or shared database writes.
