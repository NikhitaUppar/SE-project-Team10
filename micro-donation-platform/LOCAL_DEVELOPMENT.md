# Run the app locally with Gmail delivery

The SRS specifies Nodemailer + SMTP (page 6), email verification on signup
(FR-03), and password-reset links (FR-04). It does not require Google or Gmail.
This setup uses Nodemailer with Gmail SMTP to send real emails to each
recipient's own inbox. The OTP signup frontend is unchanged.

## First-time setup

1. From `micro-donation-platform`, run `npm.cmd run install:all` on Windows.
2. Copy `backend/.env.example` to `backend/.env` only if the local file does
   not already exist. Keep your existing Supabase URL and backend service key.
3. For an existing Supabase database, apply the verification migration using SQL Editor:
   `backend/src/config/migrations/005_email_verification.sql`. Do not rerun
   `schema.sql` on existing tables. For an empty database, run the schema first.
4. Enable 2-Step Verification on the project's personal Gmail sender account.
   Generate an app password at <https://myaccount.google.com/apppasswords>.
   Configure the following privately in `backend/.env`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-project-sender@gmail.com
   SMTP_PASS=your-google-app-password
   EMAIL_FROM=your-project-sender@gmail.com
   CLIENT_URL=http://localhost:5173
   ```

   Use the same sender address for `SMTP_USER` and `EMAIL_FROM`. Use an app
   password, not the regular Google account password. Do not commit credentials.
5. From the backend folder, run `npm.cmd run check:smtp`. It checks the
   connection and authentication without sending an email. A successful check
   does not by itself confirm inbox delivery.

Supabase and Gmail require an internet connection. The frontend and backend
run on your computer. Secrets belong only in the ignored backend `.env`.

## Start and test

Run `npm.cmd run dev` from `micro-donation-platform`. It starts the backend,
and frontend. On other shells, `npm run dev` also works. It does not start
the local inbox.

- App: <http://localhost:5173>
- Backend health: <http://localhost:5000/api/health>

1. Open signup, enter your display name and a new email address, then click
   **Send verification code**. Use a real email address whose inbox you can
   access. Addresses such as `student@example.test` cannot receive real mail.
2. Open the recipient's Gmail inbox, find the **Your MicroDonate verification
   code** message, and copy its six digits. Check Spam if needed. Enter them on the signup page and
   click **Verify code**. The code expires after five minutes, with at most
   five incorrect attempts. A resend is available after one minute.
3. After verification, choose your password and click **Create account**.
   The eye button shows or hides what you type. Your account is created only
   at this final step, with its email already verified. You can then log in.
Password reset is implemented in the separate issue #6 PR, based on this branch.

For an account created earlier, enter its email and password on the login
page and click **Resend verification email** instead of signing up again.
This older-account recovery flow still uses a verification link. Resends have
a one-minute cooldown. New signups use the code flow above.

Pending signup codes and verified signup proofs are held in the local backend's
memory. A backend restart or a page refresh requires starting signup again.
Verified proof expires ten minutes after code verification. Registered accounts
remain in Supabase. This flow needs no new SQL migration beyond the existing
setup; deploying across multiple backend processes would require shared storage
for pending signups.

Stop the development servers with Ctrl+C. After editing backend `.env`,
restart the servers so the backend reloads the settings.

## Automated checks

From the backend folder: `npm.cmd test -- --runInBand`.
From the frontend folder: `npm.cmd run build`.

The tests use isolated local databases and SMTP sinks; they do not require a
Google account or send external email.

The local inbox remains available as a separate developer test tool via
`npm.cmd run dev:mail`. Real Gmail delivery does not use that tool. Tests may
set their own loopback SMTP settings without modifying the application's `.env`.
