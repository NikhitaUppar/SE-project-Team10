# Issue #12: campaign owner progress updates (FR-09)

Issue: <https://github.com/NikhitaUppar/SE-project-Team10/issues/12>

Implemented on `feature/12-campaign-progress-updates`, based on updated
`origin/main` at `509d358`. The working tree was clean before switching to
main, pulling with `--ff-only`, and creating this branch. Both authentication
PRs and campaign creation/upload/browsing were already included in that main.
The original feature branches and teammates' changes were preserved.

## Acceptance criteria

| GitHub criterion | Implementation and evidence |
| --- | --- |
| `POST /api/campaigns/:id/updates` creates an update | Inserts a trimmed progress update into the existing `campaign_updates` table and returns 201 with the saved row. Isolated PostgreSQL tests verify persistence, campaign ID, database-generated UUID and timestamp. |
| Updates shown chronologically on campaign page | Public GET returns `created_at ASC, id ASC`; the campaign page shows text and local posting dates oldest first. Browser checks verify ordering, reload persistence, and immediate display after posting. |
| Only the campaign owner can post updates | Existing JWT middleware loads the current verified user; `requireRole('campaign_owner')` checks the database role, then the controller compares `campaign.owner_id` with `req.user.id`. Tests reject guests, invalid/expired tokens, other owners, donors, and admins. |

## API and permissions

`POST /api/campaigns/:id/updates` requires a bearer JWT and a JSON body:

```json
{ "content": "The first batch of school supplies has been delivered." }
```

The route validates a UUID campaign ID and text of 1–5000 characters after
trimming. It checks campaign existence and ownership before writing and only
allows campaigns whose current status is `active`. Pending, rejected, and
closed campaigns cannot receive updates. This issue does not implement the
separate auto-close feature in issue #13.

Success returns `{ "message": "Progress update posted", "update": { ... } }`
with HTTP 201. The saved update includes `id`, `campaign_id`, `content`, and
`created_at`. The server ignores client-supplied user/owner IDs, campaign IDs
in the body, and creation timestamps. Author identity is established through
the existing campaign ownership relationship; no duplicate author column is
needed in the existing table.

`GET /api/campaigns/:id/updates` returns `{ "updates": [...] }`, including an
empty list when the campaign has no updates. Read access is public, matching
the existing campaign detail endpoint. Previously posted updates remain
readable on closed campaigns. Equal timestamps are ordered consistently by ID.

Response codes: 400 for invalid IDs/text; 401 for missing or invalid identity;
403 for wrong role or ownership; 404 for a nonexistent campaign; 409 for an
inactive campaign; 500 for database errors. Internal database messages are
not returned to clients.

## Database and environment

The existing schema already defines:

- `campaigns.owner_id` referencing `users.id`;
- `campaign_updates.id` with a generated UUID;
- `campaign_updates.campaign_id` referencing `campaigns.id` with cascading deletion;
- required text `content` and a `created_at` timestamp defaulting to `NOW()`.

A read-only check confirmed all four expected update columns are available in
the connected shared Supabase project. **No new migration is required.** This
feature does not alter tables or apply SQL to the shared database. Do not rerun
`schema.sql` on existing tables. Fresh installations use the project's existing
schema and authentication migration instructions.

Uses the existing backend `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and JWT
configuration, and frontend `VITE_API_URL`. Required variables were present;
no credentials were changed, printed, or committed. Both `.env` files remain
ignored. Test fixtures use their own local PostgreSQL and test-only JWT secret.

## Frontend behavior

The existing campaign page now contains a progress timeline and, for the owner
of an active campaign, a textarea and **Post Update** button. Requests use the
existing authenticated API client. The page shows loading, validation, API
errors, retry controls, and posting state. A successful write immediately adds
the confirmed database row without navigating or manually reloading the page.
React renders update text as text, preserving line breaks without executing HTML.

Failed campaign loads now show an error instead of the pre-existing fabricated
demo campaign. In-flight detail/update requests are aborted when the page changes,
and timeline state is keyed to the campaign ID. Donation handling and the existing
campaign layout are preserved.

## Changed files

Paths are relative to the repository root.

| File | Purpose |
| --- | --- |
| `micro-donation-platform/backend/src/controllers/campaignController.js` | Implements post/read handlers, validation, ownership/status checks, and stable ordering. |
| `micro-donation-platform/backend/src/routes/campaigns.js` | Exposes public reads and protects writes with existing JWT and campaign-owner role middleware. |
| `micro-donation-platform/frontend/src/components/campaign/CampaignUpdates.jsx` | Adds the timeline, owner form, request states, safe text rendering, and immediate UI updates. |
| `micro-donation-platform/frontend/src/pages/CampaignDetail.jsx` | Integrates the timeline, handles real campaign errors, and cancels stale detail requests. |
| `micro-donation-platform/backend/tests/campaignUpdates.integration.test.js` | Runs the isolated Node/PostgreSQL scenarios as part of the existing Jest suite. |
| `micro-donation-platform/backend/tests/campaignUpdates/fixture.cjs` | Creates isolated schema, roles, users, campaigns, real JWTs, and an Express app using production routes. |
| `micro-donation-platform/backend/tests/campaignUpdates/flow.cjs` | Tests persistence, identity, validation, status, ordering, safe failures, and campaign regressions. |
| `micro-donation-platform/backend/tests/helpers/campaignUpdatesPostgrest.cjs` | Connects the actual Supabase client to parameterized SQL in local PostgreSQL under the backend role. |
| `micro-donation-platform/backend/tests/campaignUpdates/browser.cjs` | Optional headless Chrome checks of the real React page with all API calls directed to the isolated fixture. |
| `micro-donation-platform/backend/ISSUE_12_PROGRESS_UPDATES.md` | Records requirements, implementation, setup, file review, validation, and the PR draft. |
| `README.md` | Links this feature's API/testing guide. |
| `CHANGELOG.md` | Records issue #12 changes and validation. |

## Validation

Checks executed on 2026-10-26:

- Backend: `npm.cmd test -- --runInBand` passed **14 suites / 183 Jest tests**.
  This includes the child integration suite's **24 PostgreSQL/JWT scenarios**.
- Frontend: `npm.cmd run build` passed.
- Browser: `tests/campaignUpdates/browser.cjs` passed chronology/dates, owner
  posting, whitespace rejection, spinner/disabled input, failed-write retry,
  immediate refresh, reload persistence, escaped HTML, reader-role permissions,
  390px progress-section layout, retryable reads, closed/missing campaigns, and
  the existing browse page. These checks use isolated records, not shared data.
- Creation, browse, and detail API regression checks passed using real routes;
  the existing campaign creation/upload unit tests also passed.
- The app was started with `npm.cmd run dev` from `micro-donation-platform`.
  Backend health and frontend HTTP checks passed.
- No lint script or ESLint configuration is present in this repository;
  no lint run is claimed. `git diff --check` checks patch whitespace.

Run the focused backend scenarios from `micro-donation-platform/backend`:

```powershell
node --test tests/campaignUpdates/flow.cjs
```

The optional browser runner needs the frontend running at `http://localhost:5173`
and Playwright Core installed separately. It needs no new project dependency.
For example, from the backend folder on Windows:

```powershell
npm.cmd install --prefix "$env:TEMP\microdonate-browser-tests" --no-package-lock --ignore-scripts playwright-core
$env:PLAYWRIGHT_MODULE_PATH = "$env:TEMP\microdonate-browser-tests\node_modules\playwright-core"
# Set CHROME_PATH if Chrome is not at its normal Windows installation path.
node tests/campaignUpdates/browser.cjs
```

For manual app testing, use an existing verified `campaign_owner` account and
an active campaign it owns. A donor account does not gain posting permission
by supplying another user ID. Sign in as another owner or donor, or sign out,
to confirm the timeline is readable but the form is absent. Submit as the owner
and reload to verify persistence. Test inactive campaigns and invalid IDs as well.

Existing limitations outside this issue: the signed-in navbar can overflow on
narrow screens; the new progress section fits at 390px. The existing
`CreateCampaign.jsx` is a placeholder; this issue's creation regression covers
the implemented creation API. Neither unrelated UI was rewritten. Shared remote
progress writes were not tested because they require the user's approval.

## Prepared pull request

Title: **[CAMPAIGN] Implement Campaign Progress Updates (FR-09)**

Closes #12

Campaign owners can post text updates on their own active campaigns, and all
readers can see a chronological timeline on the campaign page. Writes verify
the current JWT identity, campaign-owner role, ownership, campaign status, UUID,
and content. The existing `campaign_updates` table is reused without a migration.

Adds the read endpoint, owner form with loading/errors/retry, immediate timeline
updates, and safe text rendering. Missing campaigns display an error rather than
the previous demo fallback. Authentication, payments, and issue #13 are unchanged.

Modified files and their purposes are listed above. Validation: 183 Jest tests,
24 child PostgreSQL/JWT scenarios, frontend build, and isolated Chrome checks
passed. No credentials, `.env` files, or shared database writes are included.

The branch and PR must not be pushed/created until the user confirms. No automatic
merge is authorized.
