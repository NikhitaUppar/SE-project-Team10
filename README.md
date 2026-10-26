# Micro Donation Platform — SE Mini Project Team 10

> Donate ₹1–₹500 to verified causes. Built with React, Node/Express, Supabase, and Razorpay.

## Team
| Member | GitHub | Sprint 1 | Sprint 2 |
|---|---|---|---|
| Nikhita | @NikhitaUppar | Repo setup, CI/CD | Admin panel, Metrics |
| Harish | @harishreddy2005 | Auth (register/login/verify/reset) | Campaign updates, Auto-close |
| Ramitha | @ramithanayak98-ar | Campaign create + upload | Anon donation, Donor dashboard, Campaign stats |
| Roopesh | @roopeshp057-a11y | Razorpay, Receipt email, Browse | API tests, Docs |

## Setup

For local development with real Gmail SMTP delivery, follow
[Local development](micro-donation-platform/LOCAL_DEVELOPMENT.md).

Daily campaign expiry (issue #13), donation restrictions, timezone/deployment
configuration, and test results are documented in
[the auto-close guide](micro-donation-platform/backend/ISSUE_13_AUTO_CLOSE.md).

### Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) account
- A [Razorpay](https://razorpay.com) test account

### 1. Clone & install
```bash
git clone https://github.com/NikhitaUppar/SE-project-Team10.git
cd SE-project-Team10
npm run install:all
```

### 2. Supabase setup
1. Create a new project at supabase.com
2. Go to SQL Editor → paste the contents of `backend/src/config/schema.sql` → Run
3. Copy your Project URL and service role key

### 3. Environment variables
```bash
# Backend
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, RAZORPAY keys, SMTP details

# Frontend
cp frontend/.env.example frontend/.env
# Fill in VITE_RAZORPAY_KEY_ID
```

### 4. Run
```bash
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

## Project Structure
```
├── backend/
│   └── src/
│       ├── config/        # Supabase client, DB schema
│       ├── controllers/   # Business logic (one file per module)
│       ├── middleware/     # Auth (JWT), role check
│       └── routes/        # Express routers
├── frontend/
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── context/       # AuthContext
│       ├── pages/         # One file per route
│       └── utils/         # Axios instance
└── .github/workflows/     # CI pipeline
```

## Branch Strategy
- `main` — protected, only merged via PR
- `feature/<issue-number>-<short-desc>` — one branch per issue
- PR must pass CI before merge

## Sprint Plan
- **Sprint 1:** 19–23 Oct
- **Sprint 2:** 26–30 Oct
- **Freeze:** 7 Nov
