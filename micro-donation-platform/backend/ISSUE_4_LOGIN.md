# Issue #4: email/password login

`POST /api/auth/login` accepts `{ "email": "donor@example.com", "password": "..." }`.
Emails are trimmed and lowercased to match registration; passwords are compared
unchanged using bcrypt against the existing Supabase `users.password_hash`.

- 200: `{ token, user: { id, email, role, display_name } }` for a verified account.
- 400: missing or invalid credentials.
- 401: wrong password or nonexistent user, with the same generic error.
- 403: correct credentials for an unverified account (existing login TODO).
- 500: database or token-signing failure, without internal error details.

JWTs contain `id`, `email`, and `role`, use HS256 and `JWT_SECRET`, and expire
exactly seven days after issuance as required by the issue. The seven-day
lifetime matches `JWT_EXPIRES_IN=7d` in `.env.example` and is fixed for this feature.
Protected routes require `Authorization: Bearer <token>`, validate signature and
expiry, and load the current verified user and role from Supabase. They return
401 when authentication fails. Password hashes are never attached to `req.user`.

The React login form uses the existing API client and AuthContext to save the
token in localStorage and navigate to `/dashboard`. `GET /api/auth/me` restores
the current user after refresh. Wrong credentials display an inline message
instead of triggering the global 401 redirect. Logout clears stored credentials.
CampaignDetail no longer inserts a development token automatically.

## Configuration and verification

Use the existing backend and frontend `.env.example` files as references. Set
real `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and a strong `JWT_SECRET` in your
existing backend `.env`; keep its values private. `VITE_API_URL` points to the
backend `/api`, and `CLIENT_URL` must match the frontend origin for CORS.
No schema change or additional dependency is required.

Run `npm test -- --runInBand` from `backend` and `npm run build` from `frontend`.
The login tests use real bcrypt and JWT operations with mocked Supabase queries.
The Razorpay tests now mock the user lookup instead of relying on an
authentication bypass in test mode.

For a manual live check, use an existing verified test account in Supabase.
Submit its email/password at `/login`, confirm navigation to `/dashboard`, then
refresh and confirm the navbar still shows the signed-in state. Try a wrong
password, nonexistent email, and empty fields. Confirm `/api/auth/me` returns 401
without a token, with an altered token, and with an expired token; confirm it
returns only public user fields with the issued token. Log out and confirm the
stored token is removed.

Issue #5 adds email verification to registration; see `ISSUE_5_EMAIL_VERIFICATION.md`
for its required database migration and SMTP setup. Newly registered accounts
must follow their email link before logging in. Password reset, campaign
updates, and auto-close remain separate TODOs assigned to `harishreddy2005`.
