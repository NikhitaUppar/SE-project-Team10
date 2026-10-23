# Project change record

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
