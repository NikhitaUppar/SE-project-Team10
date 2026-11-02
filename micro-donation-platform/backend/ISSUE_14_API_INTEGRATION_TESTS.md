# Issue #14: API Integration Tests for Authentication and Donation Flows (NFR-10)

## Overview
This issue implements automated API integration tests covering the end-to-end authentication and donation flows as specified in the project SRS and Non-Functional Requirement **NFR-10 (Maintainability: Backend API test coverage >= 70% line coverage)**.

The test suite is located at:
`backend/tests/authDonation.integration.test.js`

---

## Architecture & Endpoints Covered

### 1. Authentication Flow (`/api/auth`)
- **`POST /api/auth/login`**:
  - Valid credentials return HTTP 200, a signed HS256 JWT expiring in exactly 7 days (`JWT_EXPIRES_IN=7d`), and safe user details (excluding `password_hash`).
  - Rejection with HTTP 401 on incorrect password or non-existent email.
  - Rejection with HTTP 403 when the user account is not yet verified (`is_verified = false`).
  - Rejection with HTTP 400 on missing parameters or passwords exceeding 72 bytes.
- **`GET /api/auth/me` (Protected Route Guard)**:
  - Valid Bearer token returns HTTP 200 with sanitized user profile.
  - Missing token returns HTTP 401 (`No token provided`).
  - Malformed or non-Bearer authorization header returns HTTP 401.
  - Forged or invalid signature token returns HTTP 401.
  - Expired token returns HTTP 401 (`Token expired or invalid`).

### 2. Donation Flow (`/api/donations`)
- **`POST /api/donations/create-order`**:
  - Rejection of unauthenticated requests with HTTP 401.
  - Strict validation of micro-donation limits (₹1 to ₹500 INR):
    - Rejection of amounts below ₹1 (e.g. ₹0, negative amounts) with HTTP 400.
    - Rejection of amounts above ₹500 (e.g. ₹501) with HTTP 400.
    - Rejection of non-numeric or missing amounts with HTTP 400.
    - Rejection of missing `campaign_id` with HTTP 400.
  - Valid micro-donations (e.g. ₹1 boundary, ₹250 standard, ₹500 boundary) return HTTP 200 with `{ order_id, amount, currency, key_id }`.
  - Anonymous donation flag (`is_anonymous: true`) is handled and recorded.
- **`POST /api/donations/verify`**:
  - Rejection of unauthenticated verification requests with HTTP 401.
  - Rejection of missing verification parameters with HTTP 400.
  - Rejection of invalid or forged payment signatures with HTTP 400 (`Invalid payment signature`).
  - Valid HMAC SHA-256 signatures return HTTP 200, mark the donation as `completed`, and trigger the official donation receipt email pipeline.
  - **Idempotency**: Repeated or duplicate verification requests return HTTP 200 with `already_processed: true` and do NOT dispatch duplicate emails.

### 3. Combined End-to-End Flow
- Executes the complete user story sequentially:
  1. Donor authenticates via `POST /api/auth/login`.
  2. Donor verifies session via `GET /api/auth/me`.
  3. Donor creates a ₹300 micro-donation order via `POST /api/donations/create-order`.
  4. Razorpay payment is authorized and HMAC signature is computed.
  5. Donor verifies payment via `POST /api/donations/verify`.
  6. Backend confirms completion and dispatches receipt email.

---

## Safe Testing Approach & Security Guardrails
- **No Real Payments**: Uses Razorpay test mode mock orders and deterministic HMAC SHA-256 signatures. No live banking or UPI requests are ever triggered.
- **No Email Spam**: Nodemailer transports are mocked in the integration test; no external SMTP connections or email deliveries take place during test runs.
- **Isolated Fixtures**: Uses in-memory Map stores and column-projection mocks, preventing interference with production databases.

---

## Verification & Execution

### Run Issue #14 Integration Test Suite Only:
```bash
npm test -- tests/authDonation.integration.test.js
```
*(On Windows PowerShell: `npm.cmd test -- tests/authDonation.integration.test.js`)*

### Run Full Test Suite with NFR-10 Coverage:
```bash
npm test
```
*(On Windows PowerShell: `npm.cmd test`)*

### Test Results
- **Issue #14 Tests**: 27 passed, 27 total (100% pass rate).
- **Full Backend Suite**: 15 test suites passed, 218 tests passed.
- **NFR-10 Maintainability**: **81.67% line coverage** (exceeds the required >= 70% target).
