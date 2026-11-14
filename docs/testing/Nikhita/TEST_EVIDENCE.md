# Manual Feature Testing — Nikhita
**Tester:** Nikhita Uppar | **Date:** 2026-11-14 | **Sprint:** 3

---

## Test Cases

| ID | What to test | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| AD-01 | Admin dashboard loads | Login as admin → go to `/admin` | Metrics + pending campaigns visible | everything working good able to login, change password and also forgot password is working| DONE |
| AD-02 | Non-admin blocked | Login as donor → go to `/admin` | Access denied / redirect |access is denied (showing forbidden) if you login as non admin |DONE |
| AR-01 | Pending campaign appears | Submit campaign as user → login as admin | Campaign shows in pending list |working good, able to create campaign and also able to verify the campaign as admin |DONE |
| AR-02 | Approve campaign | Click Approve on pending campaign | "Campaign approved." message, removed from list |working good |DONE |
| AR-03 | Reject campaign | Click Reject → add reason → Confirm | "Campaign rejected." message, removed from list | working good| DONE|
| AR-04 | Approved campaign goes live | Approve → browse as guest | Campaign visible publicly | after the campaign goes live the image is not visible|TO DO |
| AM-01 | Metrics show real data | Load admin dashboard | All 4 metric cards show numbers | metrics show real number|DONE |

---

## Bugs Found

| Bug ID | Description | Severity |
AR-03| while creating campaign it's taking image after creating campaign when the campaign is live the image is not visible| moderate

---

## Summary: &nbsp; Pass: ___ / 7 &nbsp; Fail: ___


