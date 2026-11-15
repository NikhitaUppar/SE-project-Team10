# ✅ Code Coverage Report — Micro Donation Platform (Team 10)

**Prepared by**: Haris (Code Coverage Testing)
**Date**: 15 November 2026
**Project**: SE Mini Project — Micro Donation Platform (Team 10)
**Tool**: Jest `--coverage`

---

## 🏆 Final Overall Result

| Metric | Result | Target (NFR-10) | Status |
|---|---|---|---|
| **Line Coverage** | **83.36%** | ≥ 70% | ✅ PASSED |
| **Statement Coverage** | **81.42%** | ≥ 70% | ✅ PASSED |
| **Function Coverage** | **77.87%** | ≥ 70% | ✅ PASSED |
| **Branch Coverage** | **70.17%** | ≥ 70% | ✅ PASSED |

**Test Suites:** 26 / 26 Passed ✅
**Total Tests:** 302 / 302 Passed ✅
**Time Taken:** 21.6 seconds

---

## 📊 Per-File Coverage Table

| File | Statements % | Branch % | Functions % | Lines % |
|---|---|---|---|---|
| **src/controllers** | | | | |
| `adminController.js` | 92.3% ✅ | 86% ✅ | 75% ✅ | 95.12% ✅ |
| `authController.js` | 98.43% ✅ | 94.73% ✅ | 100% ✅ | 99.15% ✅ |
| `signupController.js` | 94.68% ✅ | 88.05% ✅ | 100% ✅ | 97.53% ✅ |
| `userController.js` | 100% ✅ | 70% ✅ | 100% ✅ | 100% ✅ |
| `campaignDonorsController.js` | 92.85% ✅ | 75% ✅ | 100% ✅ | 91.66% ✅ |
| `donationController.js` | 64.13% 🟡 | 58.95% 🟡 | 100% ✅ | 67.91% 🟡 |
| `campaignController.js` | 63.91% 🟡 | 56.42% 🟡 | 62.5% 🟡 | 66.03% 🟡 |
| `emailController.js` | 50% 🟠 | 50.84% 🟠 | 25% 🟠 | 56.41% 🟠 |
| **src/middleware** | | | | |
| `auth.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `passwordResetRateLimit.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| **src/services** | | | | |
| `emailVerification.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `campaignLifecycle.js` | 100% ✅ | 76.19% ✅ | 100% ✅ | 100% ✅ |
| `campaignDonors.js` | 94.59% ✅ | 87.27% ✅ | 100% ✅ | 100% ✅ |
| `paymentSettlement.js` | 100% ✅ | 83.33% ✅ | 100% ✅ | 100% ✅ |
| **src/jobs** | | | | |
| `campaignExpiryJob.js` | 100% ✅ | 63.63% 🟡 | 100% ✅ | 100% ✅ |
| **src/routes** | | | | |
| `admin.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `auth.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `donations.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `users.js` | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ |
| `campaigns.js` | 61.29% 🟡 | 0% ❌ | 0% ❌ | 61.29% 🟡 |

---

## 🌿 Branch Coverage — What It Means

> Branch coverage checks whether **both sides of every if/else** in the code were tested.
> **Final Score: 70.17% ✅ — Target MET**

### ✅ Fully Covered Branches (100%)

| Module | What Was Tested |
|---|---|
| `auth.js` (JWT middleware) | Valid token ✅ · Missing token → 401 ✅ · Expired token → 401 ✅ · Wrong role → 403 ✅ · `auth_version` mismatch → 401 ✅ |
| `passwordResetRateLimit.js` | Within limit → allowed ✅ · Exceeds limit → 429 ✅ |
| `emailVerification.js` | Valid token → verified ✅ · Invalid/expired → rejected ✅ |

### ✅ Well Covered Branches (>80%)

| Module | Branch % | Key Branches Tested |
|---|---|---|
| `authController.js` | 94.73% | Correct login ✅ · Wrong password ✅ · Unverified account ✅ · Invalid inputs ✅ |
| `adminController.js` | 86% | Approve existing ✅ · Approve missing → 404 ✅ · Reject with/without reason ✅ · Metrics with errors ✅ |
| `signupController.js` | 88.05% | OTP sent ✅ · Code verified ✅ · Account created ✅ · Rate limited ✅ · Locked out ✅ |
| `paymentSettlement.js` | 83.33% | Success ✅ · Error → throws ✅ · Null data → throws ✅ · Missing/forbidden results ✅ |
| `campaignDonors.js` | 87.27% | Anonymous donor masked ✅ · Named donor shown ✅ |

### 🟡 Partially Covered Branches

| Module | Branch % | What's Missing |
|---|---|---|
| `donationController.js` | 58.95% | `payment.failed` webhook event not tested |
| `campaignController.js` | 56.42% | File upload error paths, proof type rejection |
| `emailController.js` | 50.84% | SMTP send functions (`sendPasswordResetEmail`, `sendSignupCode`) |

---

## 📏 Code Coverage — What It Means

> Code coverage measures how many lines of code were actually **executed** during testing.
> **Final Score: 83.36% Lines ✅ — Target MET**

- Total lines in the project: **~986 lines**
- Lines executed during testing: **~822 lines**
- **83 out of every 100 lines were run during the test suite**

### Best Covered Files (100% Lines)
- `userController.js` — Donor dashboard
- `campaignLifecycle.js` — Campaign expiry logic
- `campaignDonors.js` — Donor privacy & leaderboard
- `emailVerification.js` — Token verification
- `auth.js` — JWT security middleware
- `paymentSettlement.js` — Payment reconciliation service
- `campaignExpiryJob.js` — Midnight auto-close cron

---

## 🔬 Branch Coverage Examples (From This Project)

### Example 1 — Login ✅ (94.73% branches)
```
if (email & password valid)
   if (user found in DB AND password matches)
      if (user is email-verified)
         → ✅ TESTED: Returns JWT token (200)
      else
         → ✅ TESTED: Returns 403 "verify email"
   else
      → ✅ TESTED: Returns 401 "invalid credentials"
else
   → ✅ TESTED: Returns 400 "invalid input"
```

### Example 2 — Admin Approve Campaign ✅ (86% branches)
```
if (campaign exists in DB)
   → ✅ TESTED: Approves, sends notification email (200)
else (not found)
   → ✅ TESTED: Returns 404 "Campaign not found"

if (owner has an email)
   → ✅ TESTED: Sends approval notification email
else (no email)
   → ✅ TESTED: Skips email, no crash
```

### Example 3 — Payment Webhook ❌ (58.95% branches)
```
if (event === 'payment.captured')
   → 🟡 Partially tested
else if (event === 'payment.failed')
   → ❌ NOT TESTED — This branch was never triggered in any test
```

---

## 📋 Test Suites Summary

| Test File | Tests | Result |
|---|---|---|
| `adminController.test.js` *(new)* | 17 | ✅ PASS |
| `paymentSettlement.test.js` *(new)* | 8 | ✅ PASS |
| `login.test.js` | 15 | ✅ PASS |
| `signupCode.test.js` | 17 | ✅ PASS |
| `authController.test.js` | — | ✅ PASS |
| `passwordReset.test.js` | — | ✅ PASS |
| `passwordReset.integration.test.js` | — | ✅ PASS |
| `emailVerification.integration.test.js` | — | ✅ PASS |
| `authDonation.integration.test.js` | — | ✅ PASS |
| `razorpay.test.js` | — | ✅ PASS |
| `receipt_email.test.js` | — | ✅ PASS |
| `campaignController.test.js` | — | ✅ PASS |
| `campaignStats.test.js` | — | ✅ PASS |
| `campaignUpload.test.js` | — | ✅ PASS |
| `campaignDonors.test.js` | — | ✅ PASS |
| `campaignLifecycle.test.js` | — | ✅ PASS |
| `campaignExpiryJob.test.js` | — | ✅ PASS |
| `campaignExpiry.integration.test.js` | — | ✅ PASS |
| `campaignExpiryStartup.test.js` | — | ✅ PASS |
| `campaignUpdates.integration.test.js` | — | ✅ PASS |
| `donorLeaderboard.integration.test.js` | — | ✅ PASS |
| `userController.test.js` | — | ✅ PASS |
| `myCampaigns.test.js` | — | ✅ PASS |
| `localInbox.test.js` | — | ✅ PASS |
| `mailTransportConfig.test.js` | — | ✅ PASS |
| `emailVerification.test.js` | — | ✅ PASS |
| **TOTAL** | **302** | ✅ **ALL PASS** |

---

## ✅ NFR-10 Compliance — Final Verdict

| Requirement | Target | Achieved | Verdict |
|---|---|---|---|
| Line Coverage | ≥ 70% | **83.36%** | ✅ **MET** |
| Statement Coverage | ≥ 70% | **81.42%** | ✅ **MET** |
| Function Coverage | ≥ 70% | **77.87%** | ✅ **MET** |
| Branch Coverage | ≥ 70% | **70.17%** | ✅ **MET** |

> **The project fully satisfies NFR-10: all 4 coverage metrics are at or above the 70% threshold.**

---

## 🔧 What Was Done to Improve Coverage

Two new test files were written to cover previously untested modules:

### 1. `tests/adminController.test.js` (17 new tests)
- Was at **6% branch coverage → now 86%**
- Tests added: get pending campaigns, approve campaign (success/404/500/no-email), reject campaign (with reason/without/404/500), platform metrics (success/error cases/zero donations)

### 2. `tests/paymentSettlement.test.js` (8 new tests)
- Was at **0% branch coverage → now 83.33%**
- Tests added: RPC called with correct args, success result, already_completed, error thrown, null data thrown, default donorId=null, missing result, forbidden result

---

*Code Coverage Report — SE Mini Project Team 10 | 15 November 2026*
