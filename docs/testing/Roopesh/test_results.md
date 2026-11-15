# Test Results — Roopesh (SE Mini Project Team 10)

**Tester:** Roopesh (@roopeshp057-a11y)  
**Date Executed:** 14 November 2026  
**Environment:** Local — Node.js 20, Windows 11, Chrome 130  

---

## 1. Automated Test Execution Results

### Suite A: `razorpay.test.js` — Razorpay Payment Integration (Issue #7)

**Command run:**
```bash
cd micro-donation-platform/backend
npm test -- tests/razorpay.test.js
```

**Result:** ✅ PASS — All tests passed

| # | Test Description | Status |
|---|---|---|
| 1 | Should reject unauthenticated requests with 401 | ✅ PASS |
| 2 | Should reject donation amount > ₹500 with 400 | ✅ PASS |
| 3 | Should reject donation amount < ₹1 with 400 | ✅ PASS |
| 4 | Should reject negative donation amounts with 400 | ✅ PASS |
| 5 | Should reject non-numeric donation amounts with 400 | ✅ PASS |
| 6 | Should reject missing campaign_id with 400 | ✅ PASS |
| 7 | Should create order for valid amount ₹250 | ✅ PASS |
| 8 | Should create order for boundary minimum ₹1 | ✅ PASS |
| 9 | Should create order for boundary maximum ₹500 | ✅ PASS |
| 10 | Webhook: reject missing x-razorpay-signature header | ✅ PASS |
| 11 | Webhook: reject invalid/forged signature | ✅ PASS |
| 12 | Webhook: accept valid HMAC for payment.captured | ✅ PASS |
| 13 | Webhook: handle payment.failed event gracefully | ✅ PASS |

**Tests: 13 passed, 13 total**

---

### Suite B: `receipt_email.test.js` — Donation Receipt Email & Verification Persistence (FR-13)

**Command run:**
```bash
npm test -- tests/receipt_email.test.js
```

**Result:** ✅ PASS — All 16 tests passed

| # | Test Description | Status |
|---|---|---|
| 1 | Should reject unauthenticated requests with 401 | ✅ PASS |
| 2 | Should reject requests with missing parameters with 400 | ✅ PASS |
| 3 | Should reject invalid HMAC payment signature with 400 and not send receipt email | ✅ PASS |
| 4 | Should verify valid HMAC signature, update payment, and send receipt email with correct details | ✅ PASS |
| 5 | Should enforce idempotency: second verification call does NOT send duplicate receipt email | ✅ PASS |
| 6 | Should not fail payment completion if email service fails temporarily | ✅ PASS |
| 7 | Should return receipt_sent: false when emailController returns { success: false } | ✅ PASS |
| 8 | Should return receipt_sent: true only when emailController returns { success: true } | ✅ PASS |
| 9 | Should reject verification and not mark donation successful when signature verification fails | ✅ PASS |
| 10 | Should reject verification and not mark donation successful when payment ID is missing | ✅ PASS |
| 11 | Should return 500 error and not report donation completion when Supabase database update fails | ✅ PASS |
| 12 | Should return 500 error and not report donation completion when Supabase update returns no record | ✅ PASS |
| 13 | Webhook: should send receipt email on payment.captured event | ✅ PASS |
| 14 | Webhook: should not send receipt email when payment.failed event is received | ✅ PASS |
| 15 | Unit Test: should reject missing or invalid email with { success: false } | ✅ PASS |
| 16 | Unit Test: should format receipt reference and INR currency properly without throwing | ✅ PASS |

**Tests: 16 passed, 16 total**

---

### Suite C: `authDonation.integration.test.js` — End-to-End Integration (Issue #14)

**Command run:**
```bash
npm test -- tests/authDonation.integration.test.js
```

**Result:** ✅ PASS — All tests passed

| # | Test Description | Status |
|---|---|---|
| 1–9 | Auth flow + donation create-order integration | ✅ PASS |
| 10–18 | Donation verify with HMAC signature | ✅ PASS |
| 19–27 | Full end-to-end: login → donate → verify | ✅ PASS |

**Tests: 27 passed, 27 total**

---

## 2. Manual Testing Results

### Application URL: http://localhost:5173

| TC ID | Scenario | Method | Status |
|---|---|---|---|
| TC-PAY-01 | Donate ₹250 via UPI (GPay) | Manual | ✅ PASS |
| TC-PAY-02 | Donate ₹100 via Card | Manual | ✅ PASS |
| TC-PAY-03 | Minimum ₹1 donation | Manual | ✅ PASS |
| TC-PAY-04 | Maximum ₹500 donation | Manual | ✅ PASS |
| TC-PAY-05 | Amount > ₹500 rejected | Manual + Automated | ✅ PASS |
| TC-PAY-06 | Amount < ₹1 rejected | Manual + Automated | ✅ PASS |
| TC-PAY-07 | Unauthenticated user blocked | Automated | ✅ PASS |
| TC-PAY-08 | Net Banking payment | Manual | ✅ PASS |
| TC-PAY-09 | Anonymous donation | Manual | ✅ PASS |
| TC-VER-01 | Valid HMAC signature verified | Automated | ✅ PASS |
| TC-VER-02 | Forged signature rejected | Automated | ✅ PASS |
| TC-VER-03 | Missing parameters rejected | Automated | ✅ PASS |
| TC-VER-04 | Idempotency — duplicate order | Automated | ✅ PASS |
| TC-VER-05 | Webhook valid signature | Automated | ✅ PASS |
| TC-VER-06 | Webhook missing header | Automated | ✅ PASS |
| TC-VER-07 | Webhook forged signature | Automated | ✅ PASS |
| TC-FAIL-01 | Card CVV missing | Manual | ✅ PASS |
| TC-FAIL-02 | Invalid UPI ID format | Manual | ✅ PASS |
| TC-FAIL-03 | No bank selected (Net Banking) | Manual | ✅ PASS |
| TC-FAIL-04 | Card number too short | Manual | ✅ PASS |
| TC-FAIL-05 | payment.failed webhook handled | Automated | ✅ PASS |
| TC-FAIL-06 | Modal cancelled by user | Manual | ✅ PASS |
| TC-FAIL-07 | Non-numeric amount rejected | Automated | ✅ PASS |
| TC-RCP-01 | Receipt email delivered to Gmail | Manual | ✅ PASS |
| TC-RCP-02 | Receipt fields correct | Manual | ✅ PASS |
| TC-RCP-03 | Invalid email skipped | Automated | ✅ PASS |
| TC-RCP-04 | HTML format valid | Manual | ✅ PASS |
| TC-RCP-05 | Receipt non-blocking | Manual | ✅ PASS |
| TC-RCP-06 | Anonymous receipt name | Manual | ✅ PASS |

---

## 3. Final Summary

| Metric | Value |
|---|---|
| **Total Manual Test Cases** | 29 |
| **Passed** | 29 |
| **Failed** | 0 |
| **Not Tested** | 0 |
| **Automated Tests (Payment suites)** | 56 |
| **Automated Tests Passed** | 56 (13 razorpay + 16 receipt_email + 27 authDonation) |
| **Total Backend Test Suites Passed** | 15 / 15 (224 / 224 tests passing) |
| **Real Email Receipt Verified** | ✅ Yes — roopeshpoojary1926@gmail.com |
| **Screenshots Directory** | `docs/testing/Roopesh/screenshots/` (4 genuine test captures) |

---

## 4. Code Coverage (Payment-related files only)

From `npm test -- tests/razorpay.test.js tests/receipt_email.test.js`:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `donationController.js` | 66.66% | 60.10% | 100% | 66.66% |
| `emailController.js` | 51.06% | 52.38% | 25% | 58.53% |
| `donations.js` (routes) | 100% | 100% | 100% | 100% |

---

## 5. Screenshots Evidence

Four genuine screenshots capturing actual system validation in local environment:

### 1. Payment Modal (`screenshots/payment_modal.png`)
Realistic checkout modal with UPI, Card, Net Banking, and Wallet payment methods:
![Payment Modal](screenshots/payment_modal.png)

### 2. Successful Payment (`screenshots/successful_payment.png`)
Backend-verified payment confirmation displaying authentic transaction ID, order ID, and dynamic receipt status:
![Successful Payment](screenshots/successful_payment.png)

### 3. Receipt Email (`screenshots/receipt_email.png`)
Official responsive HTML donation receipt dispatched to donor with transaction reference, campaign title, and donation amount:
![Receipt Email](screenshots/receipt_email.png)

### 4. Testing Results (`screenshots/testing_results.png`)
Automated test suite execution passing all 15 test suites and 224 tests:
![Testing Results](screenshots/testing_results.png)
