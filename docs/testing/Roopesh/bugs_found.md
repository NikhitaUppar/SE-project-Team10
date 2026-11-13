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

## Notes

- No bugs were found in the core backend payment logic (Razorpay order creation, HMAC signature verification, webhook handling).
- All 50 relevant automated backend tests pass.
- All bugs found were in the development/testing environment configuration and frontend payment UI, not in production backend logic.
