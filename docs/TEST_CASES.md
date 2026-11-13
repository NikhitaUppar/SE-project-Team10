# Test Cases — Micro Donation Platform
**Team 10 · SE Mini Project**  
Last updated: 2026-11-04  
Sprint coverage: Sprints 1–3 (all merged features on `main`)

---

## Overview

| Layer | Suite count | Test cases |
|---|---|---|
| Unit | 18 | 245 |
| Integration | 6 | 32 |
| **Total** | **24** | **277** |

All 277 tests pass on `main` as of `a4e1076`.  
Backend coverage: **77.41% statements / 79.91% lines**.  
Frontend: build passes; no automated unit tests (manual acceptance testing required — see [TEST_REPORT.md](TEST_REPORT.md)).

---

## Module 1 — Authentication & Session Management
**Issue #4 (login), #5 (email verification), #6 (password reset)**  
Files: `tests/login.test.js`, `tests/signupCode.test.js`, `tests/emailVerification.test.js`, `tests/passwordReset.test.js`, `src/controllers/authController.test.js`

### TC-01 — Login (Issue #4)
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-01-01 | Valid credentials return a signed JWT expiring in exactly 7 days and a safe user object | Unit | 200, JWT, user without `password_hash` |
| TC-01-02 | Nonexistent user returns the same generic 401 as a wrong password | Unit | 401 |
| TC-01-03 | Missing request body returns 400 | Unit | 400 |
| TC-01-04 | Correct password for an unverified account returns 403 without a token | Unit | 403, no token |
| TC-01-05 | Wrong password for an unverified account still returns generic 401 | Unit | 401 |
| TC-01-06 | Accepts the current session version without exposing internal `auth_version` data | Unit | 200, no `auth_version` in response |
| TC-01-07 | Loads public user fields from the database and uses its current role | Unit | 200, role from DB not token |

### TC-02 — Protected Route / Auth Middleware
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-02-01 | Rejects stale/invalid session version (undefined, 0, -1, 1, 2) after password reset | Unit | 401 "Session expired" |
| TC-02-02 | Rejects deleted user | Unit | 401 |
| TC-02-03 | Rejects unverified user | Unit | 401 |
| TC-02-04 | Rejects database error | Unit | 401 |
| TC-02-05 | Rejects database rejection | Unit | 401 |

### TC-03 — Signup (Email Verification, Issue #5)
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-03-01 | Sends 6-digit OTP without creating a user or returning the code | Unit | 200, no user in DB |
| TC-03-02 | Requires verification before creating a user, even if a code is submitted as proof | Unit | 400 |
| TC-03-03 | Creates a verified donor with original name, normalised email, and bcrypt password | Unit | 201, user in DB |
| TC-03-04 | Binds verification proof and code to the email address | Unit | Proof scoped to email |
| TC-03-05 | Expires codes after 5 minutes | Unit | 400 after expiry |
| TC-03-06 | Locks a code after 5 incorrect attempts | Unit | 429 on 6th attempt |
| TC-03-07 | Enforces resend cooldown and replaces earlier codes | Unit | 429 within cooldown |
| TC-03-08 | Consumes a code once and expires the verified proof after 10 minutes | Unit | 400 on second use |
| TC-03-09 | Resending invalidates a previously verified proof | Unit | 400 on old proof |
| TC-03-10 | Only one simultaneous create request can consume a proof | Unit | Idempotent |
| TC-03-11 | Allows a valid proof to retry a database failure without returning private details | Unit | 500, no private data |
| TC-03-12 | Rejects duplicate accounts without sending another email | Unit | 409 |
| TC-03-13 | Reports SMTP failure without creating an account; lets user retry | Unit | 500, no user created |
| TC-03-14 | Verified account does not generate another token or email | Unit | 409 |
| TC-03-15 | Resend normalises email, stores a digest different from the emailed token | Unit | Digest ≠ raw token |
| TC-03-16 | Throttling returns 429 and does not send mail | Unit | 429 |
| TC-03-17 | Concurrently verified user does not get another email | Unit | Idempotent |
| TC-03-18 | Acknowledges before account lookup completes, hiding lookup and SMTP timing | Unit | 200 fast |

### TC-04 — Password Reset (Issue #6)
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-04-01 | Normalises email, emails a random token, stores only its digest | Unit | Email sent, digest in DB |
| TC-04-02 | Uses bcrypt cost 12, preserves password whitespace, calls the atomic reset function | Unit | bcrypt $2b$12$…, session revoked |
| TC-04-03 | Limits each IP independently and resets the window with Retry-After | Unit | 429 + Retry-After header |
| TC-04-04 | Bounds stored client entries and supports socket IP fallback | Unit | LRU eviction |

---

## Module 2 — Campaign Management
**Issues #12, #13, #17, #33, #34**  
Files: `tests/campaignController.test.js`, `tests/campaignStats.test.js`, `tests/myCampaigns.test.js`, `tests/campaignUpload.test.js`, `tests/campaignLifecycle.test.js`, `tests/campaignExpiryJob.test.js`, `tests/campaignExpiryStartup.test.js`

### TC-05 — Campaign CRUD
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-05-01 | Creates a campaign successfully | Unit | 201 |
| TC-05-02 | Rejects missing required fields | Unit | 400 |
| TC-05-03 | Rejects an invalid fundraising goal | Unit | 400 |
| TC-05-04 | Rejects a past deadline | Unit | 400 |
| TC-05-05 | Returns 500 when the database fails | Unit | 500 |
| TC-05-06 | Returns paginated active campaigns with progress % for guest users | Unit | 200, pagination |
| TC-05-07 | Filters by category query param when provided (FR-17) | Unit | 200, filtered list |
| TC-05-08 | Does not filter when category is "All" | Unit | 200, full list |
| TC-05-09 | Supports pagination parameters (page and limit) | Unit | Correct page slice |
| TC-05-10 | Returns 500 when Supabase query fails | Unit | 500 |
| TC-05-11 | Returns campaign details with calculated progress | Unit | 200 + % progress |
| TC-05-12 | Returns 404 when campaign does not exist | Unit | 404 |
| TC-05-13 | Returns completed donations with donor name for public donations | Unit | 200, donor names |
| TC-05-14 | Masks donor name as "Anonymous" when `is_anonymous` is true | Unit | "Anonymous" |
| TC-05-15 | Falls back to "Donor" when public donor has no display_name | Unit | "Donor" |
| TC-05-16 | Applies custom limit query parameter correctly | Unit | Correct slice |

### TC-06 — My Campaigns & Stats
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-06-01 | Returns campaigns belonging to the logged-in owner | Unit | 200 |
| TC-06-02 | Returns 401 when user is not logged in | Unit | 401 |
| TC-06-03 | Returns empty array when owner has no campaigns | Unit | 200, `[]` |
| TC-06-04 | Returns 500 when the database query fails | Unit | 500 |
| TC-06-05 | Returns fundraising statistics for the campaign owner | Unit | 200, stats object |

### TC-07 — Auto-Close / Campaign Lifecycle (Issue #13)
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-07-01 | Timezone-aware comparisons treat equal instants as still-open boundary | Unit | Campaign open at deadline |
| TC-07-02 | Public presentation closes expired active campaigns without mutating input | Unit | Status "closed" in response |
| TC-07-03 | Bulk closing uses one conditional status-only write, UTC strict cutoff | Unit | Single DB write |
| TC-07-04 | Invalid cutoff or database error is handled safely | Unit | No crash |
| TC-07-05 | Availability checks run in `NODE_ENV=test` as well as development | Unit | Check passes |
| TC-07-06 | Active browsing filters deadlines at the database before pagination/counting | Unit | Expired excluded |
| TC-07-07 | Campaign details expose expired status/permission even before the job runs | Unit | 200, expired flag |
| TC-07-08 | Starts a catch-up run and schedules daily midnight in project timezone | Unit | Cron scheduled |
| TC-07-09 | The installed cron matcher identifies midnight in the configured timezone | Unit | Correct cron expr |
| TC-07-10 | Repeated startup does not register duplicate jobs; stop allows restart | Unit | 1 job registered |
| TC-07-11 | Supports explicit timezone settings and rejects invalid deployment values | Unit | Error on bad TZ |
| TC-07-12 | Skips overlapping runs and permits later checks | Unit | Skip logged |
| TC-07-13 | Failed jobs are contained and next daily invocation can retry | Unit | No crash |

---

## Module 3 — Donations & Payments
**Issues #3 (Razorpay), #14 (auth-donation API tests)**  
Files: `tests/razorpay.test.js`, `tests/receipt_email.test.js`, `tests/authDonation.integration.test.js`

### TC-08 — Donation Order Creation
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-08-01 | Rejects unauthenticated requests with 401 | Unit | 401 |
| TC-08-02 | Rejects donation amount > ₹500 with 400 | Unit | 400 |
| TC-08-03 | Rejects donation amount < ₹1 with 400 | Unit | 400 |
| TC-08-04 | Rejects negative amounts with 400 | Unit | 400 |
| TC-08-05 | Rejects non-numeric amounts with 400 | Unit | 400 |
| TC-08-06 | Rejects missing `campaign_id` with 400 | Unit | 400 |
| TC-08-07 | Successfully creates order for valid amount ₹250 | Unit | 200, order object |
| TC-08-08 | Successfully creates order for boundary minimum ₹1 | Unit | 200 |
| TC-08-09 | Successfully creates order for boundary maximum ₹500 | Unit | 200 |

### TC-09 — Webhook Verification & Receipt
| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-09-01 | Rejects webhook when signature header is missing with 400 | Unit | 400 |
| TC-09-02 | Rejects webhook with invalid/forged signature with 400 | Unit | 400 |
| TC-09-03 | Accepts webhook and confirms payment on valid HMAC for `payment.captured` | Unit | 200, payment confirmed |
| TC-09-04 | Processes `payment.failed` webhook with valid HMAC | Unit | 200 |
| TC-09-05 | Rejects unauthenticated requests with 401 | Unit | 401 |
| TC-09-06 | Rejects requests with missing parameters with 400 | Unit | 400 |
| TC-09-07 | Rejects invalid HMAC payment signature with 400; does not send receipt | Unit | 400, no email |
| TC-09-08 | Verifies valid HMAC, updates payment, sends receipt with correct details | Unit | 200, email sent |
| TC-09-09 | Idempotency: second verification does NOT send duplicate receipt | Unit | 200, 1 email total |
| TC-09-10 | Does not fail payment completion if email service fails temporarily | Unit | 200 |
| TC-09-11 | Sends receipt on `payment.captured` webhook | Unit | Email sent |
| TC-09-12 | Does not send receipt on `payment.failed` event | Unit | No email |
| TC-09-13 | Formats receipt reference and INR currency correctly | Unit | "₹" in email |

---

## Module 4 — Donor Leaderboard (Issue #36)
**File:** `tests/campaignDonors.test.js`

| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-10-01 | Aggregates named donors, limits top/recent lists to 5, uses exact rupee decimals | Unit | Correct aggregation |
| TC-10-02 | Anonymity masks names and never adds anonymous amounts to named totals | Unit | "Anonymous" masked |
| TC-10-03 | Also excludes captured records explicitly awaiting campaign reconciliation | Unit | Pending excluded |
| TC-10-04 | Deduplicates repeated records and provider payment/order IDs | Unit | No duplicates |
| TC-10-05 | A duplicate private/anonymous copy can never reveal its named identity | Unit | Name still hidden |
| TC-10-06 | A record linking separate order-only and payment-only copies counted once | Unit | Count = 1 |
| TC-10-07 | Ties, missing/deleted users, and newest-first ordering are deterministic | Unit | Stable sort |
| TC-10-08 | Loads a campaign beyond Supabase row limits with keyset paging | Unit | All records loaded |
| TC-10-09 | Empty histories return two empty arrays | Unit | `{top:[], recent:[]}` |
| TC-10-10 | Invalid IDs fail before querying the database | Unit | 400 |

---

## Module 5 — Email Infrastructure
**Issues #5, #6**  
Files: `tests/emailVerification.test.js`, `tests/mailTransportConfig.test.js`, `tests/localInbox.test.js`

| ID | Test Case | Type | Expected Result |
|---|---|---|---|
| TC-11-01 | Captures a real SMTP message, decodes its text, and serves inbox locally | Unit | Message readable |
| TC-11-02 | Rejects foreign Host headers instead of exposing local emails | Unit | 403 |
| TC-11-03 | Gmail on port 587 requires TLS and accepts spaced app-password format | Unit | Transport created |
| TC-11-04 | Port 465 uses implicit TLS | Unit | Transport created |
| TC-11-05 | Isolated local SMTP tests work without authentication or TLS | Unit | Transport created |

---

## Module 6 — Integration Suites
**Files:** `tests/authDonation.integration.test.js`, `tests/campaignExpiry.integration.test.js`, `tests/campaignUpdates.integration.test.js`, `tests/emailVerification.integration.test.js`, `tests/passwordReset.integration.test.js`, `tests/donorLeaderboard.integration.test.js`

| ID | Test Suite | Covers | Outcome |
|---|---|---|---|
| TC-12-01 | Auth & Donation Integration | Login → JWT → order create → payment verify → receipt (end-to-end donor journey) | PASS |
| TC-12-02 | Campaign Expiry Integration | Auto-close job against real PGlite + real routes | PASS |
| TC-12-03 | Campaign Progress Updates Integration | Updates against real JWT + real Supabase client | PASS |
| TC-12-04 | Email Verification Integration | Real SMTP (smtp-server) + PGlite end-to-end | PASS |
| TC-12-05 | Password Reset Integration | Real SMTP + PGlite + session revocation | PASS |
| TC-12-06 | Donor Leaderboard Integration | Real PGlite + route + frontend formatting | PASS |

### TC-12-01 Detail — Full Donor Journey
| Step | Test Case | Expected Result |
|---|---|---|
| 1 | Login with valid credentials → JWT expiring in 7 days | 200, JWT |
| 2 | Reject login: wrong password | 401 |
| 3 | Reject login: unknown email | 401 |
| 4 | Reject login: unverified account | 403 |
| 5 | Reject login: missing fields | 400 |
| 6 | Reject login: password > 72 bytes | 400 |
| 7 | GET /me with valid Bearer token → user profile without password_hash | 200 |
| 8 | Reject /me: missing Authorization header | 401 |
| 9 | Reject /me: non-Bearer format | 401 |
| 10 | Reject /me: forged token signature | 401 |
| 11 | Reject /me: expired token | 401 |
| 12 | Reject unauthenticated donation order | 401 |
| 13 | Create order: valid ₹250 | 200 |
| 14 | Create order: boundary ₹1 | 200 |
| 15 | Create order: boundary ₹500 | 200 |
| 16 | Create order: anonymous donation — flag recorded | 200 |
| 17 | Reject order: ₹0 | 400 |
| 18 | Reject order: ₹501 | 400 |
| 19 | Reject order: negative | 400 |
| 20 | Reject order: non-numeric | 400 |
| 21 | Reject order: missing campaign_id | 400 |
| 22 | Verify payment: unauthenticated → 401 | 401 |
| 23 | Verify payment: missing params → 400 | 400 |
| 24 | Verify payment: invalid HMAC → 400, no email | 400 |
| 25 | Verify payment: valid HMAC → 200, receipt sent | 200, email |
| 26 | Idempotency: re-verify same payment → 200, no duplicate email | 200, 1 email |
| 27 | End-to-end: credentials → order → verify → receipt | Full journey PASS |

---

## Manual / Acceptance Test Cases (Frontend)
*No automated frontend tests exist. These must be executed manually against the staging URL after deployment.*

| ID | User Flow | Steps | Expected |
|---|---|---|---|
| MT-01 | Donor signup | Register → receive OTP email → enter code → account created | Redirected to dashboard |
| MT-02 | Donor login | Login with verified account | JWT set, redirected |
| MT-03 | Browse campaigns | Visit home page as guest | Campaign cards with progress bars visible |
| MT-04 | Filter by category | Select a category filter | Only matching campaigns shown |
| MT-05 | View campaign detail | Click a campaign card | Detail page with progress, description, deadline |
| MT-06 | Make a donation | Login → open campaign → enter ₹50 → Razorpay modal | Payment modal opens, receipt email arrives |
| MT-07 | Anonymous donation | Tick anonymous → donate | Donor name shown as "Anonymous" on leaderboard |
| MT-08 | Donation boundary: ₹1 | Enter 1 → submit | Order created successfully |
| MT-09 | Donation boundary: ₹500 | Enter 500 → submit | Order created successfully |
| MT-10 | Donation over limit | Enter 501 | Error message, order not created |
| MT-11 | Create campaign | Login as creator → fill form + upload proof doc → submit | Campaign in "Pending review" |
| MT-12 | Admin approve campaign | Login as admin → approve pending campaign | Campaign visible publicly |
| MT-13 | Campaign progress update | Creator adds update text | Update visible on campaign detail |
| MT-14 | Auto-close expired campaign | Wait for campaign deadline to pass | Campaign shows "Closed", donation button disabled |
| MT-15 | Donor leaderboard | View campaign with donations | Top donors and recent donors listed |
| MT-16 | Password reset | Click "Forgot password" → enter email → receive link → reset | New password works, old sessions rejected |
| MT-17 | My campaigns | Creator views dashboard | Only their campaigns shown |
| MT-18 | Fundraising stats | Creator views stats for own campaign | Total raised, donor count, progress % shown |
