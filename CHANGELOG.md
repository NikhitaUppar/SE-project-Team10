# Project change record

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
