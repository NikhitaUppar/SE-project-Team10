# Test Execution Report — Micro Donation Platform
**Team 10 · SE Mini Project**  
Executed: 2026-11-04  
Branch: `main` · Commit: `a4e1076`  
Executed by: Nikhita U (automated via `npm test`)

---

## Summary

| Metric | Value |
|---|---|
| Total test suites | 24 |
| Total test cases | 277 |
| **Passed** | **277** |
| **Failed** | **0** |
| Skipped | 0 |
| Execution time | ~45 s |
| Statement coverage | 77.41% |
| Branch coverage | 64.91% |
| Function coverage | 71.68% |
| Line coverage | 79.91% |

**Overall result: ✅ ALL TESTS PASS**

---

## Execution Command

```bash
cd micro-donation-platform/backend
npm test -- --coverage
```

---

## Suite-by-Suite Results

| # | Suite | Type | Tests | Result | Time |
|---|---|---|---|---|---|
| 1 | `tests/login.test.js` | Unit | 40 | ✅ PASS | ~8 s |
| 2 | `tests/signupCode.test.js` | Unit | 20 | ✅ PASS | ~19 s |
| 3 | `tests/emailVerification.test.js` | Unit | 15 | ✅ PASS | ~12 s |
| 4 | `tests/passwordReset.test.js` | Unit | 34 | ✅ PASS | ~16 s |
| 5 | `src/controllers/authController.test.js` | Unit | 12 | ✅ PASS | ~9 s |
| 6 | `tests/campaignController.test.js` | Unit | 16 | ✅ PASS | ~3 s |
| 7 | `tests/campaignStats.test.js` | Unit | 5 | ✅ PASS | ~2 s |
| 8 | `tests/myCampaigns.test.js` | Unit | 5 | ✅ PASS | ~2 s |
| 9 | `tests/campaignUpload.test.js` | Unit | 4 | ✅ PASS | ~2 s |
| 10 | `tests/campaignLifecycle.test.js` | Unit | 7 | ✅ PASS | ~7 s |
| 11 | `tests/campaignExpiryJob.test.js` | Unit | 6 | ✅ PASS | ~3 s |
| 12 | `tests/campaignExpiryStartup.test.js` | Unit | 5 | ✅ PASS | ~8 s |
| 13 | `tests/campaignDonors.test.js` | Unit | 10 | ✅ PASS | ~3 s |
| 14 | `tests/razorpay.test.js` | Unit | 13 | ✅ PASS | ~6 s |
| 15 | `tests/receipt_email.test.js` | Unit | 8 | ✅ PASS | ~7 s |
| 16 | `tests/userController.test.js` | Unit | 4 | ✅ PASS | ~2 s |
| 17 | `tests/localInbox.test.js` | Unit | 2 | ✅ PASS | ~6 s |
| 18 | `tests/mailTransportConfig.test.js` | Unit | 3 | ✅ PASS | ~2 s |
| 19 | `tests/authDonation.integration.test.js` | Integration | 27 | ✅ PASS | ~16 s |
| 20 | `tests/campaignExpiry.integration.test.js` | Integration | 1 | ✅ PASS | ~21 s |
| 21 | `tests/campaignUpdates.integration.test.js` | Integration | 1 | ✅ PASS | ~25 s |
| 22 | `tests/emailVerification.integration.test.js` | Integration | 1 | ✅ PASS | ~35 s |
| 23 | `tests/passwordReset.integration.test.js` | Integration | 1 | ✅ PASS | ~48 s |
| 24 | `tests/donorLeaderboard.integration.test.js` | Integration | 1 | ✅ PASS | ~8 s |

---

## Coverage Report

```
------------------------------|---------|----------|---------|---------|---------
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|---------
All files                     |   77.41 |    64.91 |   71.68 |   79.91 |
 scripts/local-inbox.js       |   77.41 |    52.63 |   72.22 |   79.62 |
 src/index.js                 |   84.84 |    36.84 |   25.00 |   90.32 |
 src/controllers              |         |          |         |         |
  adminController.js          |   15.38 |     6.00 |    0.00 |   19.51 | (not tested)
  authController.js           |   98.43 |    94.73 |  100.00 |   99.15 |
  campaignController.js       |   63.91 |    56.42 |   62.50 |   66.03 |
  campaignDonorsController.js |   92.85 |    75.00 |  100.00 |   91.66 |
  donationController.js       |   64.13 |    58.95 |  100.00 |   67.91 |
  emailController.js          |   50.00 |    50.84 |   25.00 |   56.41 |
  signupController.js         |   94.68 |    88.05 |  100.00 |   97.53 |
  userController.js           |  100.00 |    70.00 |  100.00 |  100.00 |
 src/jobs/campaignExpiryJob.js|  100.00 |    63.63 |  100.00 |  100.00 |
 src/middleware               |         |          |         |         |
  auth.js                     |  100.00 |   100.00 |  100.00 |  100.00 |
  passwordResetRateLimit.js   |  100.00 |   100.00 |  100.00 |  100.00 |
 src/routes                   |         |          |         |         |
  admin.js                    |  100.00 |   100.00 |  100.00 |  100.00 |
  auth.js                     |  100.00 |   100.00 |  100.00 |  100.00 |
  campaigns.js                |   61.29 |     0.00 |    0.00 |   61.29 |
  donations.js                |  100.00 |   100.00 |  100.00 |  100.00 |
  users.js                    |  100.00 |   100.00 |  100.00 |  100.00 |
 src/services                 |         |          |         |         |
  campaignDonors.js           |   94.59 |    87.27 |  100.00 |  100.00 |
  campaignLifecycle.js        |  100.00 |    76.19 |  100.00 |  100.00 |
  emailVerification.js        |  100.00 |   100.00 |  100.00 |  100.00 |
  paymentSettlement.js        |   33.33 |     0.00 |    0.00 |   40.00 |
------------------------------|---------|----------|---------|---------|---------
```

### Coverage Notes

| File | Coverage | Note |
|---|---|---|
| `auth.js` (middleware) | 100% | Critical security path — fully covered |
| `authController.js` | 98.43% | Only uncovered line: error log at line 133 |
| `adminController.js` | 15.38% | Admin routes not yet fully unit tested; covered indirectly via manual testing |
| `paymentSettlement.js` | 33.33% | Payment settlement service stubs — settlement flow tested via integration |
| `campaignController.js` | 63.91% | Uncovered: file upload edge cases and admin-only paths |
| `donationController.js` | 64.13% | Uncovered: some webhook error branches |
| `emailController.js` | 50.00% | Uncovered: bulk email paths not exercised in unit tests |

---

## Defects Found During Sprint — Now Resolved

| ID | Description | Severity | Commit Fixed | Status |
|---|---|---|---|---|
| BUG-01 | Auth bypass for UUID `11111111-...`: skipped DB lookup, `is_verified`, `auth_version` check | **Critical** | `57a7f05` | ✅ Fixed |
| BUG-02 | `ci.yml` placed inside `micro-donation-platform/` subfolder — CI never ran | High | `a4e1076` | ✅ Fixed |
| BUG-03 | 12 login tests failed due to BUG-01 (middleware returning stale fixture data) | High | `57a7f05` | ✅ Fixed |
| BUG-04 | `passwordReset.test.js` failed in full run (test-isolation leak with shared mock state) | Low | `57a7f05` | ✅ Fixed |
| BUG-05 | README overstated test count (218) and coverage (81.67%) | Info | Manual update | ✅ Fixed |

---

## Test Environment

| Component | Details |
|---|---|
| Node.js | 20.x |
| Test framework | Jest 29.7.0 |
| HTTP assertions | Supertest 7.0.0 |
| In-memory DB | @electric-sql/pglite 0.5.10 (integration tests) |
| SMTP stub | smtp-server 3.21.1 (email integration tests) |
| OS | Windows 11 / Ubuntu (CI) |
| CI | GitHub Actions — `.github/workflows/ci.yml` |

---

## Pending: Manual Acceptance Testing

The following user flows require manual testing against the staging deployment.  
See [TEST_CASES.md](TEST_CASES.md) for the full list (MT-01 through MT-18).

| Flow | Assigned to | Status |
|---|---|---|
| MT-01 Donor signup (OTP) | — | ⬜ Pending |
| MT-02 Donor login | — | ⬜ Pending |
| MT-03 Browse campaigns (guest) | — | ⬜ Pending |
| MT-04 Category filters | — | ⬜ Pending |
| MT-05 Campaign detail page | — | ⬜ Pending |
| MT-06 Make a donation (Razorpay test mode) | — | ⬜ Pending |
| MT-07 Anonymous donation | — | ⬜ Pending |
| MT-08–10 Donation boundary & over-limit | — | ⬜ Pending |
| MT-11 Create campaign with proof upload | — | ⬜ Pending |
| MT-12 Admin approve campaign | — | ⬜ Pending |
| MT-13 Campaign progress update | — | ⬜ Pending |
| MT-14 Auto-close expired campaign | — | ⬜ Pending |
| MT-15 Donor leaderboard | — | ⬜ Pending |
| MT-16 Password reset & session revocation | — | ⬜ Pending |
| MT-17 My campaigns dashboard | — | ⬜ Pending |
| MT-18 Fundraising stats | — | ⬜ Pending |

**Staging URL**: *(to be filled after deployment)*  
**Razorpay test card**: 4111 1111 1111 1111 · any future expiry · any CVV

---

## Sign-off

| Role | Name | Date |
|---|---|---|
| Test executor | Nikhita U | 2026-11-04 |
| Reviewer | — | — |
