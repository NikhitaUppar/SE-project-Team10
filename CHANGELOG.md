# Project change record

## 2026-11-03: PR #53 conflict resolution

- Integrated main `8816d6d`, including merged progress updates, video support,
  and campaign-start navigation, into the existing issue #36 PR branch.
- Resolved the four conflicting files while keeping both progress and donors
  sections, both guide links, new upload/navigation changes, and existing checkout.
- Frontend build and combined-page browser checks passed. Full backend: 235
  passed / 12 inherited login failures, with no auth or payment-controller change.
- Updated browser fixtures/selectors for the combined timeline and donor lists.
  No shared database writes or private environment changes.

## 2026-11-02: Issue #36 campaign donor leaderboard

- Updated main at `d9c48d1` and created `feature/36-donor-leaderboard`.
  Unmerged issue #12/#13 branches remain separate and preserved.
- Added a public top/recent-donors API using completed records, privacy masking,
  exact paise totals, deterministic ties, provider deduplication, and keyset paging.
- Replaced the old supporters block with Top Donors and Recent Donations, INR,
  relative timestamps, responsive layout, loading/error/retry, and refresh after
  existing payment verification. No payment/authentication flow changes.
- 13 PostgreSQL/formatting scenarios, frontend build, and isolated Chrome passed.
  Full backend: 234 passed / 12 failed; all failures are in unchanged main login
  tests. The feature guide records those inherited failures.
- No migration, new dependency, private environment change, shared write, real
  payment, or email. User approval is required before push/PR creation.

## 2026-11-03: PR #52 conflict resolution

- Integrated main `8816d6d`; resolved campaign detail and documentation conflicts.
- Preserved expiry/donation restrictions, merged progress updates, video uploads,
  campaign-start navigation, error handling, and both documentation histories.
- Frontend build and expiry/progress browser walkthroughs passed. Full backend:
  248 passed / 12 inherited login failures. Tests use isolated PostgreSQL; the
  existing required migration remains unapplied remotely.
- No shared writes or private environment changes; PR title and Issue #13 unchanged.

## 2026-11-02: Issue #13 integration with current main

- Preserved the existing feature branch and fast-forwarded main to `d9c48d1`.
- Reused the lifecycle service, explicit midnight scheduler, startup catch-up,
  and availability checks; resolved conflicts with newer checkout/campaign code.
- Added duplicate scheduler protection and transactional payment reconciliation
  so captured payments after closure are recorded without crediting closed totals.
- Generated migration `013_campaign_expiry_payments.sql`; tested it in isolated
  PostgreSQL only. It has NOT been applied to shared Supabase.
- 21 PostgreSQL scenarios, frontend build, and isolated browser checks passed.
  Full backend: 247 passed / 12 failed; main independently reproduces all 12
  login-test failures. Auth middleware and login tests are unchanged.
- Preserved private environments, teammates' changes, and separate issue #12.
  No shared writes/payments/emails were used for this task. Await push approval.

## 2026-10-26: Issue #13 auto-close campaigns past deadline (FR-10)

- Created `feature/13-auto-close-campaigns` from fetched, fast-forwarded main
  at `509d358`. The unmerged issue #12 branch and PR were preserved.
- Implemented a single conditional status-only update for active campaigns
  strictly past their timezone-aware deadlines. Already-closed and other
  non-active statuses, campaign details, donations, and progress records stay intact.
- Replaced the scheduler TODO with daily midnight execution in Asia/Kolkata,
  optional `CAMPAIGN_CRON_TIMEZONE`, startup catch-up, overlap prevention,
  sanitized failure logging, and retry on the next daily run.
- Centralized lifecycle rules and exposed effective closed/availability states.
  Active browsing filters expired rows before pagination; new donation orders
  always check status/deadline and fail closed when the database is unavailable.
  Existing captured-payment confirmation/webhook bookkeeping remains unchanged.
- Updated detail/card donation controls to use backend availability. API checks
  still block a stale browser page after a deadline has passed.
- Added policy, scheduler, startup, PostgreSQL integration, and optional browser
  tests. Validation passed 17 suites / 210 Jest tests, 10 child PostgreSQL cases,
  frontend build, and isolated Chrome checks. No lint command is configured.
- No migration, new dependency, private environment change, real payment/email,
  or shared campaign update was needed. The live backend was stopped during
  testing so the new startup catch-up would not mutate team records unexpectedly.
- See `micro-donation-platform/backend/ISSUE_13_AUTO_CLOSE.md` for the complete
  file review, boundary/financial rules, deployment requirements, and PR draft
  using the exact issue title. The feature branch push is authorized; merging
  requires the user's confirmation.

## 2026-11-02: PR #39 conflict resolution

- Integrated main at `e1d4ab4` into the issue #12 feature branch and resolved
  conflicts in README, campaign routes, and the campaign detail page.
- Preserved sharing/countdown, impact information, recent supporters, and owner
  stats alongside the progress timeline and role-protected owner posting.
- Passed 230 backend tests and the frontend build. Updated the isolated browser
  fixture to exercise newer campaign detail features alongside progress updates.
- No shared database writes or environment changes; PR title and issue remain
  **[CAMPAIGN] Campaign owner posts progress update (FR-09)** and **#12**.
- Before publishing, integrated newer main `d9c48d1` without conflicts. Frontend
  build and progress-update browser/integration checks passed. Full backend run:
  218 passed, 12 login-test failures from the authentication shortcut inherited
  unchanged from main. Recorded the regression in the feature guide/PR.

## 2026-10-26: Issue #12 campaign progress updates

- Safely fetched teammate changes, fast-forwarded local main to `509d358`,
  verified authentication and campaign dependencies were merged, and created
  `feature/12-campaign-progress-updates` before editing code.
- Implemented owner-only `POST /api/campaigns/:id/updates` and public
  `GET /api/campaigns/:id/updates` with validation, role/ownership and active-status
  checks, safe failures, and chronological ordering with an ID tie-break.
- Reused the existing Supabase `campaign_updates` table and database defaults;
  a read-only shared schema check succeeded. No migration, shared database write,
  environment change, or additional project dependency was needed.
- Added a campaign progress timeline and owner form with loading, errors,
  retry, safe text display, and immediate display of saved updates. Replaced
  the detail page's fabricated demo fallback with a real error state.
- Added isolated PostgreSQL/real JWT/Supabase-client integration scenarios and
  optional Chrome checks. Existing auth, donations, and issue #13 were untouched.
- Validation passed: 14 suites / 183 Jest tests, the 24 child integration
  scenarios, frontend production build, and isolated browser checks. The latter
  cover posting, reader roles, refresh/persistence, XSS, API failure/retry,
  timestamps/order, inactive/missing campaigns, browsing, and the progress
  section at 390px. No repository lint command is configured.
- Re-fetched before final review; origin/main remained `509d358` and was already
  included in this branch. See `backend/ISSUE_12_PROGRESS_UPDATES.md` under
  `micro-donation-platform` for the complete file review and prepared PR text.
- User confirmation is required before any push or PR creation for this issue.
- Follow-up: the user approved a temporary shared-database owner/campaign for
  manual local-app testing and confirmed the owner UI worked. The temporary
  account and campaign were removed afterward, and no test updates remained.
  Existing records were preserved. The user then approved pushing this branch
  and creating the issue #12 PR; automatic merge remains unauthorized.
- Pushed the approved branch and created
  [PR #39](https://github.com/NikhitaUppar/SE-project-Team10/pull/39),
  **[CAMPAIGN] Implement Campaign Progress Updates (FR-09)**, targeting `main`
  with `Closes #12`, the complete file list, and validation results. It is open
  for review and has not been merged.

## Replacement pull requests created on 2026-10-24

- Issue #5: [PR #30](https://github.com/NikhitaUppar/SE-project-Team10/pull/30),
  branch `feature/5-otp-gmail-verification`, targeting `main`. Includes OTP/Gmail
  verification and the related registration/login changes from issues #3/#4.
  Its isolated validation passed 133 tests and the frontend build.
- Issue #6: [PR #31](https://github.com/NikhitaUppar/SE-project-Team10/pull/31),
  branch `feature/6-gmail-password-reset`, initially targeting the issue #5
  branch. Includes reset links, reset-page eye controls, and issue #4 login/JWT
  session invalidation changes. The full branch passed 174 tests and its build.
- Merge PR #30 first; then update PR #31 onto merged `main` and change its base
  to `main` before merging it. A squash/rebase merge of #30 requires updating
  the second branch's ancestry to keep its diff focused.
- Older PRs #26 and #28 were not closed or merged. The author can close them
  as superseded by #30 and #31. Issues #3 and #4 remain closed.
- The original combined development history and full chronological change
  record are preserved on `feature/6-password-reset` at `7afb514`. No private
  `.env` files or Gmail/Supabase credentials were pushed.

## 2026-10-24: Issue #5 replacement PR

- Implements OTP verification before password creation, with five-minute codes,
  five incorrect attempts, one-minute resend cooldown, and single-use proofs.
- Updates the registration screen originally introduced in issue #3 and adds
  password visibility controls to signup and the login screen from issue #4.
- Keeps verification-link recovery for older unverified accounts, the #5 SQL
  migration, and the login restriction for unverified accounts.
- Uses Gmail SMTP without changing the approved OTP frontend. Gmail credentials
  belong only in the ignored backend `.env`. The user confirmed real OTP delivery.
- Includes local SMTP tooling solely for isolated tests, and a safe SMTP
  authentication diagnostic. Default app startup does not start a local inbox.
- Pending signups are held in bounded process memory; backend restarts expire
  them. No additional OTP database migration is required for this local demo.
- Password reset and session invalidation belong to the separate issue #6 PR,
  which is based on this branch. Issues #3 and #4 remain closed.
- Replaces the proposed verification changes in PR #26. The original branch
  and the combined development branch remain intact.

Validation: 11 backend suites / 133 tests passed for this branch alone.
The frontend production build passed. The full combined development branch
previously passed 174 tests and the user confirmed Gmail OTP delivery.

## 2026-10-24: Issue #6 replacement PR (based on issue #5)

- Adds forgot/reset-password APIs and Gmail reset links with a one-hour expiry,
  hashed tokens, cooldown, and transactional single-use consumption.
- Adds the #6 database migration for password reset and user auth_version.
- Updates the login controller and middleware originally introduced for #4:
  password reset invalidates old JWT sessions as well as the old password.
- Adds forgot/reset pages and routing; uses #5's shared eye control on the new
  password and confirmation fields, and adds the login-page reset link.
- Adds reset unit/integration tests and combined OTP/verification/reset checks.
- Replaces proposed password-reset changes in PR #28. Review and merge the
  issue #5 PR first, then retarget this PR to main before merging it.
- The final application source matches the tested combined development branch;
  the PR descriptions document the updates to existing #3/#4 files.

Validation for issue #6: 13 backend suites / 174 tests passed, including the
combined verification/reset integration flows. The frontend build passed.
