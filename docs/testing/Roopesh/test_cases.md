# Manual Test Cases — Roopesh (SE Mini Project Team 10)

**Tester:** Roopesh (@roopeshp057-a11y)  
**Reviewer:** Ramitha (@ramithanayak98-ar)  
**Features Assigned:** Razorpay Payments · Payment Verification · Failed Payment Handling · Donation Receipts  
**Date Prepared:** 14 November 2026  
**Environment:** Local Development — `http://localhost:5173` (Frontend) · `http://localhost:5000` (Backend API)

---

## Feature 1: Razorpay Payments (FR-11, FR-12)

---

### TC-PAY-01
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-01 |
| **Feature** | Razorpay Payments |
| **Scenario** | Successful donation with valid amount using UPI payment method |
| **Preconditions** | User is logged in · An active campaign exists · App running on localhost:5173 |
| **Steps** | 1. Navigate to any active campaign page. 2. Enter ₹250 in donation field. 3. Click "Donate ₹250 →". 4. In payment modal — select "UPI" tab. 5. Select GPay. 6. Click "Pay ₹250". |
| **Expected Result** | Payment processes successfully. Modal closes. Thank you screen shows with Payment ID. |
| **Actual Result** | ✅ Payment processed. Modal closed. Thank you screen appeared with `pay_mock_*` ID. |
| **Status** | **PASS** |

---

### TC-PAY-02
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-02 |
| **Feature** | Razorpay Payments |
| **Scenario** | Successful donation using Card payment method |
| **Preconditions** | User is logged in · Active campaign exists |
| **Steps** | 1. Enter ₹100. 2. Click Donate. 3. Select "Card" tab. 4. Enter card: `4111 1111 1111 1111`, Name: `Test User`, Expiry: `12/26`, CVV: `123`. 5. Click "Pay ₹100". |
| **Expected Result** | Payment succeeds, Thank you screen shown. |
| **Actual Result** | ✅ Payment succeeded. Campaign raised_amount updated on UI. |
| **Status** | **PASS** |

---

### TC-PAY-03
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-03 |
| **Feature** | Razorpay Payments |
| **Scenario** | Minimum boundary — donate ₹1 |
| **Preconditions** | User is logged in · Active campaign exists |
| **Steps** | 1. Enter ₹1 in custom amount field. 2. Click Donate. 3. Complete payment via any method. |
| **Expected Result** | Order created with amount=100 paise (₹1). Payment succeeds. |
| **Actual Result** | ✅ Accepted. Order amount = 100 paise. Payment completed. |
| **Status** | **PASS** |

---

### TC-PAY-04
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-04 |
| **Feature** | Razorpay Payments |
| **Scenario** | Maximum boundary — donate ₹500 |
| **Preconditions** | User is logged in · Active campaign exists |
| **Steps** | 1. Enter ₹500. 2. Click Donate. 3. Complete payment. |
| **Expected Result** | Order created with 50000 paise (₹500). Payment succeeds. |
| **Actual Result** | ✅ Accepted. Order amount = 50000 paise. |
| **Status** | **PASS** |

---

### TC-PAY-05
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-05 |
| **Feature** | Razorpay Payments |
| **Scenario** | Amount exceeds ₹500 — rejected by backend |
| **Preconditions** | User is logged in |
| **Steps** | 1. Manually enter ₹501 in the custom field. 2. Click Donate. |
| **Expected Result** | Backend returns HTTP 400: "Donation amount must be between ₹1 and ₹500". Donate button shows error. |
| **Actual Result** | ✅ Frontend validation blocks submission. Backend also returns 400 (confirmed via automated test TC-PAY-05 in razorpay.test.js). |
| **Status** | **PASS** |

---

### TC-PAY-06
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-06 |
| **Feature** | Razorpay Payments |
| **Scenario** | Amount below ₹1 — rejected |
| **Preconditions** | User is logged in |
| **Steps** | 1. Enter ₹0 or negative value. 2. Click Donate. |
| **Expected Result** | Error shown: amount must be between ₹1 and ₹500. |
| **Actual Result** | ✅ Frontend validation blocks. API returns 400 (confirmed via automated test). |
| **Status** | **PASS** |

---

### TC-PAY-07
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-07 |
| **Feature** | Razorpay Payments |
| **Scenario** | Unauthenticated user tries to donate |
| **Preconditions** | User is NOT logged in |
| **Steps** | 1. Open campaign page while logged out. 2. Attempt to click Donate. |
| **Expected Result** | API returns HTTP 401 Unauthorized. User redirected to login. |
| **Actual Result** | ✅ 401 returned (confirmed via automated test in razorpay.test.js). |
| **Status** | **PASS** |

---

### TC-PAY-08
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-08 |
| **Feature** | Razorpay Payments |
| **Scenario** | Net Banking payment method selection |
| **Preconditions** | User is logged in |
| **Steps** | 1. Enter ₹200. 2. Click Donate. 3. Select "Net Banking" tab. 4. Choose "HDFC Bank". 5. Click Pay. |
| **Expected Result** | Payment succeeds after bank selection. |
| **Actual Result** | ✅ Payment modal processed. Success screen shown. |
| **Status** | **PASS** |

---

### TC-PAY-09
| Field | Detail |
|---|---|
| **Test Case ID** | TC-PAY-09 |
| **Feature** | Razorpay Payments |
| **Scenario** | Anonymous donation toggle |
| **Preconditions** | User is logged in |
| **Steps** | 1. Enter ₹100. 2. Check "Donate anonymously". 3. Complete payment. |
| **Expected Result** | Donation is recorded as anonymous. Donor wall shows "Anonymous" not the user's name. |
| **Actual Result** | ✅ Donation shows as "Anonymous" on campaign donor wall. |
| **Status** | **PASS** |

---

## Feature 2: Payment Verification (FR-12)

---

### TC-VER-01
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-01 |
| **Feature** | Payment Verification |
| **Scenario** | Valid HMAC SHA-256 signature verified successfully |
| **Preconditions** | A payment order has been created |
| **Steps** | 1. POST to `/api/donations/verify` with valid `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. |
| **Expected Result** | HTTP 200. Response: `{ status: 'ok', message: 'Payment verified and donation completed' }` |
| **Actual Result** | ✅ Verified. Donation status updated to 'completed'. (Confirmed via authDonation.integration.test.js — 27 tests passed). |
| **Status** | **PASS** |

---

### TC-VER-02
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-02 |
| **Feature** | Payment Verification |
| **Scenario** | Invalid/forged payment signature rejected |
| **Preconditions** | A payment order exists |
| **Steps** | 1. POST to `/api/donations/verify` with tampered `razorpay_signature`. |
| **Expected Result** | HTTP 400. `{ error: 'Invalid payment signature' }` |
| **Actual Result** | ✅ 400 returned with correct error message. (Confirmed via automated tests). |
| **Status** | **PASS** |

---

### TC-VER-03
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-03 |
| **Feature** | Payment Verification |
| **Scenario** | Missing verification parameters |
| **Preconditions** | Backend running |
| **Steps** | 1. POST to `/api/donations/verify` with one or more missing fields (order_id, payment_id, signature). |
| **Expected Result** | HTTP 400. `{ error: 'Missing payment verification parameters' }` |
| **Actual Result** | ✅ 400 returned. (Confirmed via automated tests). |
| **Status** | **PASS** |

---

### TC-VER-04
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-04 |
| **Feature** | Payment Verification |
| **Scenario** | Duplicate payment verification (idempotency) |
| **Preconditions** | An order that has already been verified once |
| **Steps** | 1. POST to `/api/donations/verify` with same order_id as a previously verified payment. |
| **Expected Result** | HTTP 200. `{ already_processed: true }` — no duplicate receipt sent. |
| **Actual Result** | ✅ Idempotency guard works. Already-processed orders return 200 without duplicate processing. |
| **Status** | **PASS** |

---

### TC-VER-05
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-05 |
| **Feature** | Payment Verification |
| **Scenario** | Webhook HMAC signature validation — valid signature |
| **Preconditions** | Backend running with RAZORPAY_WEBHOOK_SECRET configured |
| **Steps** | 1. POST to `/api/donations/webhook` with valid HMAC SHA-256 signature for `payment.captured` event. |
| **Expected Result** | HTTP 200. `{ status: 'ok', received: true }` |
| **Actual Result** | ✅ Passed (razorpay.test.js — webhook suite). |
| **Status** | **PASS** |

---

### TC-VER-06
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-06 |
| **Feature** | Payment Verification |
| **Scenario** | Webhook rejected — missing signature header |
| **Preconditions** | Backend running |
| **Steps** | 1. POST to `/api/donations/webhook` without `x-razorpay-signature` header. |
| **Expected Result** | HTTP 400. `{ error: 'Missing x-razorpay-signature header' }` |
| **Actual Result** | ✅ Passed (razorpay.test.js). |
| **Status** | **PASS** |

---

### TC-VER-07
| Field | Detail |
|---|---|
| **Test Case ID** | TC-VER-07 |
| **Feature** | Payment Verification |
| **Scenario** | Webhook rejected — invalid/forged signature |
| **Preconditions** | Backend running |
| **Steps** | 1. POST to `/api/donations/webhook` with forged `x-razorpay-signature`. |
| **Expected Result** | HTTP 400. `{ error: 'Invalid signature' }` |
| **Actual Result** | ✅ Passed (razorpay.test.js). |
| **Status** | **PASS** |

---

## Feature 3: Failed Payment Handling

---

### TC-FAIL-01
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-01 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Card CVV missing — validation error shown |
| **Preconditions** | User is logged in · Payment modal open on Card tab |
| **Steps** | 1. Enter card number and name. 2. Leave CVV blank. 3. Click Pay. |
| **Expected Result** | Error message: "Enter a valid CVV (3–4 digits)" shown in modal. Payment not submitted. |
| **Actual Result** | ✅ Error shown. Payment blocked until CVV entered. |
| **Status** | **PASS** |

---

### TC-FAIL-02
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-02 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Invalid UPI ID format rejected |
| **Preconditions** | User is logged in · Payment modal open on UPI tab |
| **Steps** | 1. Select "UPI ID" mode. 2. Enter `invalidupi` (no @ symbol). 3. Click Pay. |
| **Expected Result** | Error: "Enter a valid UPI ID (e.g. name@upi)". Payment blocked. |
| **Actual Result** | ✅ Error shown correctly. |
| **Status** | **PASS** |

---

### TC-FAIL-03
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-03 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Net Banking — no bank selected |
| **Preconditions** | Payment modal open on Net Banking tab |
| **Steps** | 1. Select Net Banking tab. 2. Click Pay without selecting a bank. |
| **Expected Result** | Error: "Please select your bank". |
| **Actual Result** | ✅ Error displayed. Payment blocked. |
| **Status** | **PASS** |

---

### TC-FAIL-04
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-04 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Card number too short |
| **Preconditions** | Payment modal open on Card tab |
| **Steps** | 1. Enter only 12 digits for card number. 2. Click Pay. |
| **Expected Result** | Error: "Enter a valid 16-digit card number". |
| **Actual Result** | ✅ Validation blocks payment. |
| **Status** | **PASS** |

---

### TC-FAIL-05
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-05 |
| **Feature** | Failed Payment Handling |
| **Scenario** | `payment.failed` webhook handled gracefully |
| **Preconditions** | Backend running |
| **Steps** | 1. POST to `/api/donations/webhook` with valid HMAC and `payment.failed` event. |
| **Expected Result** | HTTP 200 (Razorpay expects 200 on all events). Donation status updated to 'failed'. |
| **Actual Result** | ✅ Passed (razorpay.test.js — webhook payment.failed test). |
| **Status** | **PASS** |

---

### TC-FAIL-06
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-06 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Modal dismiss — payment cancelled by user |
| **Preconditions** | Payment modal is open |
| **Steps** | 1. Open payment modal. 2. Click the ✕ Cancel button without paying. |
| **Expected Result** | Modal closes. No payment recorded. `isSubmitting` resets. Donate button re-enabled. |
| **Actual Result** | ✅ Modal closes cleanly. No pending state left. |
| **Status** | **PASS** |

---

### TC-FAIL-07
| Field | Detail |
|---|---|
| **Test Case ID** | TC-FAIL-07 |
| **Feature** | Failed Payment Handling |
| **Scenario** | Non-numeric donation amount rejected |
| **Preconditions** | User logged in |
| **Steps** | 1. POST `/api/donations/create-order` with `{ amount: "invalid_amount" }`. |
| **Expected Result** | HTTP 400: "Donation amount must be between ₹1 and ₹500". |
| **Actual Result** | ✅ Passed (razorpay.test.js automated test). |
| **Status** | **PASS** |

---

## Feature 4: Donation Receipts (FR-13)

---

### TC-RCP-01
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-01 |
| **Feature** | Donation Receipts |
| **Scenario** | Receipt email sent to donor after successful payment |
| **Preconditions** | Gmail SMTP configured. User logged in with valid email. |
| **Steps** | 1. Complete a successful donation. 2. Check donor's Gmail inbox. |
| **Expected Result** | HTML receipt email received with correct donor name, amount, campaign name, transaction ID, date. |
| **Actual Result** | ✅ Email sent to `roopeshp057@gmail.com`. Subject: "Donation Receipt: [Campaign Name] [RCPT-...]". All fields correct. |
| **Status** | **PASS** |

---

### TC-RCP-02
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-02 |
| **Feature** | Donation Receipts |
| **Scenario** | Receipt contains correct transaction ID and amount |
| **Preconditions** | Receipt email delivered |
| **Steps** | 1. Open received receipt email. 2. Verify Payment ID, Amount, Campaign, Date fields. |
| **Expected Result** | All fields match the payment that was made. |
| **Actual Result** | ✅ Payment ID (`pay_mock_*`), Amount (₹X.00), Campaign name, Date — all correct. |
| **Status** | **PASS** |

---

### TC-RCP-03
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-03 |
| **Feature** | Donation Receipts |
| **Scenario** | Receipt skipped for invalid/missing email address |
| **Preconditions** | Backend running |
| **Steps** | 1. Call `sendReceiptEmail(null, {...})`. 2. Observe return value. |
| **Expected Result** | Returns `{ success: false, reason: 'Invalid or missing email address' }`. No SMTP attempt made. |
| **Actual Result** | ✅ Passed (receipt_email.test.js automated test). |
| **Status** | **PASS** |

---

### TC-RCP-04
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-04 |
| **Feature** | Donation Receipts |
| **Scenario** | Receipt email format — HTML structure valid |
| **Preconditions** | Email delivered |
| **Steps** | 1. Open receipt email in Gmail. 2. Verify: header, green "✓ Payment Successful" badge, amount in INR, receipt reference number, footer. |
| **Expected Result** | Full responsive HTML email with all sections rendered correctly. |
| **Actual Result** | ✅ Email renders correctly. All sections present. |
| **Status** | **PASS** |

---

### TC-RCP-05
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-05 |
| **Feature** | Donation Receipts |
| **Scenario** | Receipt is non-blocking — payment response not delayed by email |
| **Preconditions** | Gmail SMTP configured |
| **Steps** | 1. Complete payment. 2. Measure time for Thank You screen to appear. |
| **Expected Result** | Thank You screen appears within ~1.5 seconds. Email sends in background. |
| **Actual Result** | ✅ Payment confirm appears ~1.4s. Email delivers ~3–5s later in background (fire-and-forget). |
| **Status** | **PASS** |

---

### TC-RCP-06
| Field | Detail |
|---|---|
| **Test Case ID** | TC-RCP-06 |
| **Feature** | Donation Receipts |
| **Scenario** | Anonymous donation receipt — name shown as "Anonymous Donor" |
| **Preconditions** | User donates with anonymous toggle ON |
| **Steps** | 1. Check "Donate anonymously". 2. Complete payment. 3. Check receipt email. |
| **Expected Result** | Receipt shows "Dear Anonymous Donor" not user's real name. |
| **Actual Result** | ✅ Receipt email addressed to "Anonymous Donor". |
| **Status** | **PASS** |

---

## Test Case Summary

| Feature | Total | Pass | Fail | Not Tested |
|---|---|---|---|---|
| Razorpay Payments | 9 | 9 | 0 | 0 |
| Payment Verification | 7 | 7 | 0 | 0 |
| Failed Payment Handling | 7 | 7 | 0 | 0 |
| Donation Receipts | 6 | 6 | 0 | 0 |
| **TOTAL** | **29** | **29** | **0** | **0** |
