# Issue #5: email verification on registration (FR-03)

## Current signup flow: code before password

New signups enter a display name and email, request a six-digit code, verify
it on the signup page, and only then choose a password and create the account.
The password fields have accessible show/hide eye controls. Nodemailer sends
the code through the configured SMTP sender. The app now uses Gmail delivery;
the frontend flow is unchanged, and users read codes in their own inboxes.

- `POST /api/auth/signup/send-code`: validates the name/email, rejects existing
  accounts, and sends a five-minute code. No user is created at this point.
- `POST /api/auth/signup/verify-code`: allows five incorrect attempts, consumes
  the code, and issues a random email-bound signup proof valid for ten minutes.
- `POST /api/auth/signup/complete`: checks the single-use proof and password,
  then inserts a verified user with a bcrypt cost-12 password hash. The stored
  name comes from the original code request, and the user role uses its donor
  database default.

Codes/proofs are stored as keyed digests in a bounded per-process map. Resends
invalidate earlier codes/proofs and have a one-minute cooldown. All three
routes have IP limits. Raw codes are sent only by email; they are not returned
by the send API or logged. Restarting the local backend expires pending
signups, so request another code afterward. No new database migration is
needed. Persistent shared storage would be needed for a multi-process deployment.

The link-based endpoints documented below remain for older unverified accounts
and existing API clients. The new signup page uses the code endpoints above.

Registration and login continue using the existing Supabase `public.users`
table, bcrypt hashes, and custom JWT middleware. This does not introduce
Supabase Auth or a second user store.

This implementation is integrated into the password-reset working copy.
Apply both migrations `005_email_verification.sql` and `006_password_reset.sql`
for the combined application. Existing unverified users can use the login
page's resend button after SMTP is configured.

## Database setup required before running against Supabase

For an existing database, run `src/config/migrations/005_email_verification.sql`
once in the project's Supabase SQL Editor. For a new database, run the existing
`src/config/schema.sql` first, then the migration. Do not rerun schema.sql on an
existing database: its CREATE TABLE statements are for initial setup.

The migration adds indexes and two PostgreSQL functions to the existing
`email_tokens` table. It does not delete users, campaigns, or donations. The
functions run with their caller's permissions; only the backend `service_role`
can execute them. Browser/anonymous roles cannot read token hashes or execute
verification functions. Keep the service key exclusively on the backend.

- `issue_email_verification_token`: locks the user, limits issuance to once per
  minute, replaces older links, and stores a SHA-256 digest expiring in 24 hours.
- `verify_email_token`: locks the same user, checks expiry, marks the account
  verified, and consumes all its links in one transaction. Database failures
  roll back both changes, and concurrent/replayed requests cannot verify twice.

The application generates each secret token using `crypto.randomBytes(32)`.
Raw verification tokens are emailed, never stored in the database, returned
from registration/resend APIs, or written to application logs.

## Local environment

Use the Gmail SMTP setup described in `../LOCAL_DEVELOPMENT.md`. The environment
example defaults to `smtp.gmail.com:587`; configure the sender address and app
password privately. Gmail is the selected provider, not an SRS requirement.

Configure `backend/.env` privately using `backend/.env.example` as a reference:

- `SUPABASE_URL`: the team's project URL.
- `SUPABASE_SERVICE_KEY`: the backend-only service key from the database teammate.
- `JWT_SECRET`: a private random signing secret for the existing login system.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: development/test SMTP settings.
- `EMAIL_FROM`: a sender allowed by that SMTP service.
- `CLIENT_URL`: frontend origin, normally `http://localhost:5173`.

Keep `VITE_API_URL` in the frontend environment pointing to the backend `/api`.
Do not put service keys, SMTP passwords, or JWT secrets in `VITE_*` variables.
Use the project's existing Nodemailer transport. Gmail connections on port 587
require STARTTLS; port 465 uses implicit TLS. Users open their own Gmail inboxes
to read OTPs. The local SMTP sink is retained only for separate development tests.

The ignored local `.env` holds the private backend configuration. See the root
`CHANGELOG.md` for the confirmed shared database migration and connection status.

## User flow and API

1. `POST /api/auth/register` creates an unverified account and sends the email.
   Success returns 201 with instructions to check email.
2. The email opens `/verify-email#token=...`. Its fragment keeps the secret out
   of frontend HTTP access logs. The page removes it from the address bar,
   keeps it in component memory, and requires a click on **Verify my email**.
   This avoids accidental verification by simple email-link scanners or React
   StrictMode's repeated effects. Reopen the email if the page was refreshed
   before confirmation.
3. `GET /api/auth/verify/:token` verifies the account. API clients receive JSON;
   direct browser requests accepting HTML redirect to `/login?verified=1`.
   Responses disable caching and referrer forwarding.
4. The user can now log in and receive the existing seven-day JWT. Unverified
   accounts still receive 403; no verification bypass was added.

Invalid, consumed, and already-verified links return 400. Expired links return
410. Database failures return a generic 500 without internal details.

If mail fails after account creation, registration returns 503 and explains
that the account exists. It does not falsely report successful email sending
or silently verify the account. The login page's **Resend verification email**
button submits email/password to `POST /api/auth/resend-verification`. This
checks the account password and issues a fresh link; resending within one
minute returns 429 with `Retry-After: 60`. Existing verified accounts need no
new message. New links invalidate older links.

## Tests

From `backend`, run `npm test -- --runInBand`. It includes:

- Existing registration, JWT login, campaign, Razorpay, and receipt-email tests.
- Focused verification, resend, malformed input, database-error, and SMTP-error tests.
- An integration suite using development-only PGlite PostgreSQL, the actual
  migration and Supabase client with a local PostgREST adapter, real bcrypt/JWT,
  and real Nodemailer SMTP delivery to an in-process mail sink.

Run `node --test tests/integration/emailVerification.cjs` to see each isolated
database/SMTP check individually. These tests have no external accounts or
inboxes and never load the real `.env`. They verify permissions, expiry,
replacement, replay rejection, rollback, resend cooldown, email-service
failure/recovery, and registration-to-verified-login.

From `frontend`, run `npm run build`.

For a live development check after configuring services and applying the
migration, register only a test address you control, confirm the email appears
in the test inbox, open its link, and confirm verification. Log in, refresh,
and log out. Reopen the same link to confirm it is rejected. Request another
link for a different unverified test account to test resend and expiry.
External Supabase, inbox delivery, and manual browser interactions remain
separate from the isolated automated test results.
