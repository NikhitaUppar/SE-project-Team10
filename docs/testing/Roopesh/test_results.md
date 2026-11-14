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

### Suite B: `receipt_email.test.js` — Donation Receipt Email (FR-13)

**Command run:**
```bash
npm test -- tests/receipt_email.test.js
```

**Result:** ✅ PASS — All tests passed

| # | Test Description | Status |
|---|---|---|
| 1 | sendReceiptEmail returns success:true for valid email | ✅ PASS |
| 2 | sendReceiptEmail skips for null email | ✅ PASS |
| 3 | sendReceiptEmail skips for email without @ | ✅ PASS |
| 4 | HTML template includes correct donor name | ✅ PASS |
| 5 | HTML template includes correct amount formatted | ✅ PASS |
| 6 | HTML template includes campaign name | ✅ PASS |
| 7 | HTML template includes transaction ID | ✅ PASS |
| 8 | Receipt reference number generated correctly | ✅ PASS |
| 9 | Email subject contains campaign name | ✅ PASS |
| 10 | Receipt non-fatal on SMTP error | ✅ PASS |

**Tests: 10 passed, 10 total**

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
| **Automated Tests (Payment suites)** | 50 |
| **Automated Tests Passed** | 50 |
| **Real Email Receipt Verified** | ✅ Yes — roopeshp057@gmail.com |
| **Screenshots Collected** | ✅ 3 screenshots in /screenshots folder |

---

## 4. Code Coverage (Payment-related files only)

From `npm test -- tests/razorpay.test.js tests/receipt_email.test.js`:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `donationController.js` | 59.18% | 52.57% | 100% | 59.31% |
| `emailController.js` | 51.06% | 52.38% | 25% | 58.53% |
| `donations.js` (routes) | 100% | 100% | 100% | 100% |

---

## 5. Screenshots Evidence

| Screenshot | Description |
|---|---|
| `screenshots/payment_modal_ui.jpg` | Razorpay mock modal UI open during testing |
| `screenshots/payment_method_selection.jpg` | Payment method selection screen (UPI/Card/NetBanking) |
| `screenshots/payment_success_thankyou.jpg` | Thank You screen after successful payment |
