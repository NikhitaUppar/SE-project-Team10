# Bugs Found — Roopesh (SE Mini Project Team 10)

**Tester:** Roopesh (@roopeshp057-a11y)  
**Date:** 14 November 2026  

---

## Bug Report Summary

| Bug ID | Severity | Feature | Status |
|---|---|---|---|
| BUG-01 | Medium | Razorpay Payments | Fixed |
| BUG-02 | Low | Donation Receipts | Fixed |
| BUG-03 | Low | Payment UI | Fixed |
| BUG-04 | High | Payment Verification (Frontend) | Fixed |
| BUG-05 | High | Payment Verification (Backend) | Fixed |
| BUG-06 | Medium | Donation Receipts UI | Fixed |

---

## BUG-01 — Razorpay Modal Opens and Immediately Fails with Placeholder Keys

| Field | Detail |
|---|---|
| **Bug ID** | BUG-01 |
| **Severity** | Medium |
| **Feature** | Razorpay Payments |
| **Description** | When `RAZORPAY_KEY_ID=rzp_test_placeholder` is set in `.env`, the Razorpay checkout SDK loads from CDN, opens the modal, but immediately shows "Oops! Something went wrong. Payment Failed" because the key is not a valid registered Razorpay key. The modal offers no way to go back. |
| **Steps to Reproduce** | 1. Set `RAZORPAY_KEY_ID=rzp_test_placeholder` in `backend/.env`. 2. Navigate to any campaign. 3. Click Donate. 4. Observe Razorpay modal crash. |
| **Expected** | Either a valid test payment flow OR a clear fallback. |
| **Actual** | Modal opens and immediately crashes with payment failure. No back button. Page stuck. |
| **Fix Applied** | ✅ Replaced Razorpay SDK modal with a custom `MockRazorpay.jsx` component that detects dummy keys and shows a realistic local payment UI with UPI, Card, Net Banking, and Wallet options. |
| **Fixed By** | Roopesh |
| **Fix Commit** | On branch `test/manual-testing-roopesh` |

---

## BUG-02 — Receipt Email Silently Fails with Local SMTP Sink

| Field | Detail |
|---|---|
| **Bug ID** | BUG-02 |
| **Severity** | Low |
| **Feature** | Donation Receipts |
| **Description** | Default `backend/.env` configured `SMTP_HOST=127.0.0.1` and `SMTP_PORT=1025` (local mail sink). The email appeared to send (`receipt_sent: true`) but was silently dropped — donors received no actual email receipt. |
| **Steps to Reproduce** | 1. Keep default `.env` SMTP config. 2. Complete a donation. 3. Check inbox — no email arrives. |
| **Expected** | Donor receives a formatted HTML receipt in their Gmail inbox. |
| **Actual** | No email delivered. Local sink swallows messages. |
| **Fix Applied** | ✅ Configured Gmail SMTP (`smtp.gmail.com:587`) with App Password. Receipt emails now delivered to real Gmail inboxes. |
| **Fixed By** | Roopesh |

---

## BUG-03 — Payment Modal Stuck After "Payment Successful" Screen

| Field | Detail |
|---|---|
| **Bug ID** | BUG-03 |
| **Severity** | Low |
| **Feature** | Payment UI / MockRazorpay |
| **Description** | After the mock payment showed "✅ Payment Successful!" inside the modal, the modal did not automatically close. The success state was shown both inside the modal AND on the page behind it simultaneously, with no way to dismiss the modal. |
| **Steps to Reproduce** | 1. Complete a donation. 2. Modal shows ✅ Payment Successful. 3. Modal stays open with no close button in that state. |
| **Expected** | Modal closes automatically after showing success, revealing the Thank You screen. |
| **Actual** | Modal stays open stuck on success screen. |
| **Fix Applied** | ✅ Added `onClose()` call followed by `options.handler(res)` after the done state. Modal now closes in 600ms and transitions cleanly to the Thank You page card. |
| **Fixed By** | Roopesh |

---

## BUG-04 — Frontend Silent Catch Block Hiding Payment Verification Errors

| Field | Detail |
|---|---|
| **Bug ID** | BUG-04 |
| **Severity** | High |
| **Feature** | Payment Verification (Frontend) / `CampaignDetail.jsx` |
| **Description** | `CampaignDetail.jsx` contained an empty `catch {}` block around backend payment verification. When payment verification failed on the server (e.g. invalid signature, network timeout, or DB failure), the failure was swallowed, leaving the user with an ambiguous state or claiming payment success based only on client checkout. Submit button could also be clicked multiple times during verification. |
| **Steps to Reproduce** | 1. Cause backend verification endpoint to return 400 or 500. 2. Observe frontend behaviour. |
| **Expected** | User sees an explicit, informative error alert banner and the donation is never marked as completed. Duplicate clicks are blocked during verification. |
| **Actual** | Errors were silenced; duplicate requests could be fired. |
| **Fix Applied** | ✅ Removed empty catch block. Implemented descriptive error banner, added `isVerifying` state to disable submit button with a `Verifying payment…` spinner, and ensured `setPaymentSuccess` is called strictly after backend responds with HTTP 200 `status: 'ok'`. |
| **Fixed By** | Roopesh |

---

## BUG-05 — Backend `verifyPayment` Reporting Success When Database Persistence Fails

| Field | Detail |
|---|---|
| **Bug ID** | BUG-05 |
| **Severity** | High |
| **Feature** | Payment Verification (Backend) / `donationController.js` |
| **Description** | In `verifyPayment`, database errors during the donation update query were logged to console but execution continued, returning HTTP 200 `message: 'Payment verified and donation completed'` even when Supabase failed to persist the completed status or updated 0 rows. |
| **Steps to Reproduce** | 1. Simulate DB connection error or abort during `/api/donations/verify`. 2. Observe API response. |
| **Expected** | Return HTTP 500 and halt before dispatching receipt emails or reporting donation completion. |
| **Actual** | API returned HTTP 200 with false positive donation completion. |
| **Fix Applied** | ✅ Added strict verification check `if (updateErr || !updated)` returning HTTP 500 `{ error: 'Failed to update donation status in database' }`. Added production guard ensuring DB availability before verification. Preserved idempotency with `processedOrders` and status checks. |
| **Fixed By** | Roopesh |

---

## BUG-06 — Frontend Displaying Hardcoded "Emailed" Receipt Status

| Field | Detail |
|---|---|
| **Bug ID** | BUG-06 |
| **Severity** | Medium |
| **Feature** | Donation Receipts UI / `CampaignDetail.jsx` |
| **Description** | The donation thank-you card rendered receipt status as `Emailed` unconditionally, regardless of whether the email operation succeeded, failed, or was pending. |
| **Steps to Reproduce** | 1. Disable SMTP or provide an invalid email. 2. Complete donation. 3. Observe frontend card says `Emailed`. |
| **Expected** | Card displays `Emailed` (green) if `receiptSent` is true, and `Pending` (amber) if false or null. |
| **Actual** | Unconditionally reported receipt as emailed. |
| **Fix Applied** | ✅ Bound receipt badge to `Boolean(paymentSuccess?.receiptSent) ? 'Emailed' : 'Pending'`. Backend ensures `receipt_sent` is boolean and accurately reflects email controller delivery status. |
| **Fixed By** | Roopesh |

---

## BUG-07 — Lack of Immediate Donation Amount Validation & Async Receipt Status Polling

| Field | Detail |
|---|---|
| **Bug ID** | BUG-07 |
| **Severity** | High |
| **Feature** | Donation Input Validation & Receipt Status Lifecycle |
| **Description** | 1. Invalid donation amounts (e.g. ₹0, ₹501, negative numbers) were only validated upon clicking the "Donate" button; no immediate feedback was provided while the user was typing.<br>2. When receipt email delivery completed asynchronously in the background, the frontend remained on "Pending" because it had no mechanism to poll or retrieve the updated persistent receipt status from the backend database. |
| **Steps to Reproduce** | 1. Enter `0` or `501` in the custom amount input. Notice no immediate error until submitting.<br>2. Complete a donation where receipt dispatch is asynchronous. Notice frontend card remains permanently on "Pending". |
| **Expected** | 1. Immediate error feedback while typing ("Minimum donation amount is ₹1." or "Maximum donation amount is ₹500.") and disabled Donate button.<br>2. Background receipt email delivery persists `receipt_sent` to the database, and the frontend automatically polls `/api/donations/receipt-status/:orderId` to update status to "Emailed". |
| **Actual** | Validation was deferred to form submit; frontend status permanently showed "Pending" after asynchronous email dispatch. |
| **Fix Applied** | ✅ Added `validateDonationAmount` utility with unit tests; hooked immediate feedback into `CampaignDetail.jsx` with input highlighting and disabled submit button; added `GET /api/donations/receipt-status/:orderId` endpoint with database persistence and automatic frontend polling. |
| **Fixed By** | Roopesh |

---

## Notes

- All 7 identified issues (including review items from PR #58) have been resolved and verified with automated test suites.
- All 15 backend test suites pass cleanly (239/239 tests passing).
- All frontend validation tests pass cleanly (14/14 tests passing).
- Zero merge conflicts between working branch `test/manual-testing-roopesh` and target branch `feature/15-final-documentation`.
