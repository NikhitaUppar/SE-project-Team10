# Issue #6: password reset via email link (FR-04)

This feature uses the existing Supabase `users` and `password_reset_tokens`
tables, bcrypt cost 12, Nodemailer transport, and custom seven-day JWTs.
Registration and email-verification behavior are not changed.

## Branch and setup

The feature starts from main at `7b6c9d5`. Issues #3 and #4 are merged; Issue #5
is unmerged and preserved on its own branch/PR. This implementation does not
depend on Issue #5 or apply its migration. Unverified accounts remain unable
to log in, including after resetting a password.

Before running the updated backend against Supabase, apply
`src/config/migrations/006_password_reset.sql` in the team's SQL Editor. Do not
rerun `schema.sql` on an existing database. For a new empty database only, run
schema.sql first and then the migration.

The migration adds `users.auth_version` with a default of zero, indexes the
existing reset-token table, and adds two backend-only database functions.
**Apply this migration before deploying the new login/middleware code**, which
selects the new column. No shared database migration was applied by this change.

The ignored local `.env` must contain real `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`, and `CLIENT_URL`. Use development/test mail accounts.
The existing example uses Gmail port 587 with STARTTLS; use a permitted sender
and an app password for that setup. Never put backend secrets in frontend
`VITE_*` variables. No existing environment values were replaced.

## API and user flow

- The login page links to `/forgot-password`, where a user enters their email.
- `POST /api/auth/forgot-password` accepts `{ "email": "user@example.test" }`.
  Missing/invalid email returns 400. A valid email receives the same 200 JSON
  for a known account, unknown account, account cooldown, or provider failure:
  `{ "message": "If an account exists for that email, a password reset link will be sent." }`.
  A fixed server warning reports processing failures without personal or secret
  details. The response is deliberately not confirmation of email delivery.
  The acknowledgement is sent before account lookup/SMTP processing so their
  timing is not exposed to the caller. The running backend then completes that
  work. This is not a durable mail queue: an interrupted backend may require the
  user to request another link; do not terminate it immediately after a request.
- A 32-byte cryptographically random secret is emailed; only its SHA-256 digest
  is stored. Its database expiry is exactly one hour after issuance. There is
  a one-minute per-account cooldown; a later request replaces older links.
- The email opens `/reset-password#token=...`. Fragments are not sent to the
  frontend web server or included in referrers. The page removes the secret
  from the address bar, retaining it only in component memory. If refreshed
  before completion, reopen the email link. Legacy `?token=...` links are also
  accepted and removed from the address bar.
- The reset form asks for a new password and confirmation. It uses the existing
  policy: at least eight characters and no more than 72 UTF-8 bytes.
- `POST /api/auth/reset-password` accepts `{ "token": "64 lowercase hex characters", "password": "new-password" }`.
  It hashes with bcrypt cost 12 and calls the transactional reset function.
  The function checks the digest/expiry, updates the correct user's password,
  increments their session version, and deletes all their reset links together.
- Success returns 200 and asks the user to log in again. Invalid/used links
  and invalid passwords return 400; expired links return 410; database failures
  return a generic 500. Reset does not automatically verify or log in a user.

Both database functions lock the user before modifying tokens. A failure rolls
back password, version, and token changes; simultaneous attempts cannot consume
a link twice. Database functions and token digests are inaccessible to anonymous
and browser-authenticated roles; only the backend service role may use them.

## Session invalidation and request limits

Login JWTs include the user's current `auth_version`. Protected routes compare
that claim with the database on every request. Successful reset increments the
database version, invalidating every earlier JWT for that user. Older JWTs
without the claim are treated as version zero, so they continue working until
the user's first password reset. Internal version data is not returned in user
responses. The current browser session is cleared on successful reset.

Forgot requests are limited to 5 per IP per 15 minutes and reset submissions to
20 per IP per 15 minutes. Limits return 429 with `Retry-After` and do not depend
on whether an email exists. Per-IP maps are bounded and local to each backend
process; the per-account one-minute cooldown is enforced in PostgreSQL across
instances. A multi-instance deployment should also enforce shared edge limits.
Express's existing proxy trust configuration is unchanged; configure trusted
proxies explicitly for a deployment rather than trusting arbitrary forwarding
headers. No limiter stores email addresses, passwords, or secret tokens.

## Verification

Run `npm test -- --runInBand` from backend and `npm run build` from frontend.
The only added dependency is development-only PGlite, already used for local
database testing on the separate Issue #5 branch.

The reset integration suite uses isolated PostgreSQL with the actual schema
and migration, the real Supabase client through a local PostgREST test adapter,
real bcrypt/JWT, and real Nodemailer delivery to an in-process SMTP mail sink.
It does not load the real `.env`, contact shared Supabase, or send external mail.
Run `node --test tests/passwordReset/flow.cjs` to see the individual scenarios.

Tests cover registration-to-reset-to-login, digest-only storage, exact one-hour
expiry, invalid/expired/reused links, concurrent attempts, transactional rollback,
resend cooldown, SMTP failure/recovery, account-neutral responses, request limits,
role permissions, correct user targeting, unverified-user protection, and rejection
of old passwords and sessions. Existing registration, login, campaign, upload,
payment, and receipt tests also run. Issue #5's unmerged verification code is
preserved separately and is not claimed as part of this branch's test coverage.

For live development testing after applying the migration and filling in private
JWT/SMTP settings, use a test account and inbox you control. Request the reset,
confirm inbox delivery, follow the link, and set/confirm the new password. Check
new-password login, rejection of the old password, and invalidation of earlier
sessions. Live shared Supabase, external inbox delivery, and manual browser
interaction remain separate checks from the isolated automated results.
