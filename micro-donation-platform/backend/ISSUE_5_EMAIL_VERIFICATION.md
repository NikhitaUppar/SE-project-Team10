# Issue #5: email verification on registration (FR-03)

Registration and login continue using the existing Supabase `public.users`
table, bcrypt hashes, and custom JWT middleware. This does not introduce
Supabase Auth or a second user store.

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

Configure `backend/.env` privately using `backend/.env.example` as a reference:

- `SUPABASE_URL`: the team's project URL.
- `SUPABASE_SERVICE_KEY`: the backend-only service key from the database teammate.
- `JWT_SECRET`: a private random signing secret for the existing login system.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: development/test SMTP settings.
- `EMAIL_FROM`: a sender allowed by that SMTP service.
- `CLIENT_URL`: frontend origin, normally `http://localhost:5173`.

Keep `VITE_API_URL` in the frontend environment pointing to the backend `/api`.
Do not put service keys, SMTP passwords, or JWT secrets in `VITE_*` variables.
Use the project's existing Nodemailer transport (port 587 with STARTTLS for the
example settings). SMTP acceptance means the server accepted the message;
inbox delivery must be confirmed separately.

The supplied project URL was set in the ignored local `.env`. Real backend
keys and SMTP settings still need local configuration if they are placeholders.
The migration has not been applied to the shared Supabase project by this change.

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
