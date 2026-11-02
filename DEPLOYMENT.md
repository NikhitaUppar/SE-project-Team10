# Deployment Documentation — Micro Donation Platform

Comprehensive production and staging deployment guide for the **Micro Donation Platform** (Team 10).

This document outlines how to deploy the React frontend, Node.js/Express backend, Supabase database, and Razorpay payment gateway to cloud environments without exposing sensitive credentials.

---

## Table of Contents
1. [Architecture & Cloud Hosting Stack](#1-architecture--cloud-hosting-stack)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Supabase Cloud Database Setup](#step-1-supabase-cloud-database-setup)
4. [Step 2: Razorpay Payment Gateway Setup](#step-2-razorpay-payment-gateway-setup)
5. [Step 3: Gmail SMTP Service Setup](#step-3-gmail-smtp-service-setup)
6. [Step 4: Backend Deployment (Render / Railway)](#step-4-backend-deployment-render--railway)
7. [Step 5: Frontend Deployment (Vercel / Netlify)](#step-5-frontend-deployment-vercel--netlify)
8. [Step 6: Connecting Frontend and Backend](#step-6-connecting-frontend-and-backend)
9. [Step 7: Verification and Smoke Testing](#step-7-verification-and-smoke-testing)
10. [Security and Credential Best Practices](#security-and-credential-best-practices)

---

## 1. Architecture & Cloud Hosting Stack

```
  +------------------+         HTTPS (API Requests)         +--------------------+
  |  Vercel/Netlify  | -----------------------------------> |   Render/Railway   |
  |  React Frontend  | <----------------------------------- |   Node.js/Express  |
  +------------------+     CORS Whitelisted (CLIENT_URL)    +--------------------+
           |                                                          |
           | Client Checkout SDK                                      | REST / Service Role
           v                                                          v
  +------------------+                                      +--------------------+
  |  Razorpay Cloud  | <--- Server Verification / Webhook - |  Supabase Postgres |
  +------------------+                                      +--------------------+
                                                                      |
                                                                      v
                                                            +--------------------+
                                                            |  Gmail SMTP Relay  |
                                                            +--------------------+
```

| Component | Recommended Cloud Platform | Alternative Platforms |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Netlify, Cloudflare Pages |
| **Backend API** | [Render](https://render.com) | Railway, Fly.io, AWS EC2 |
| **Database & Auth** | [Supabase](https://supabase.com) | Self-hosted PostgreSQL |
| **Payment Gateway** | [Razorpay Dashboard](https://dashboard.razorpay.com) | — |
| **Email SMTP** | [Google Workspace / Gmail](https://myaccount.google.com) | SendGrid, Resend, AWS SES |

---

## 2. Prerequisites
Before beginning deployment, ensure you have:
- A GitHub account with access to this repository.
- A free [Supabase](https://supabase.com) account.
- A [Razorpay](https://razorpay.com) account (with Test Mode enabled).
- A Gmail account with 2-Step Verification enabled (to generate an App Password).
- A free [Render](https://render.com) or [Railway](https://railway.app) account.
- A free [Vercel](https://vercel.com) or [Netlify](https://netlify.com) account.

---

## Step 1: Supabase Cloud Database Setup

1. **Create a Supabase Project**:
   - Log in to [Supabase](https://app.supabase.com) and click **New project**.
   - Enter a project name (e.g., `micro-donation-platform-prod`).
   - Set a strong database password and select the region closest to your users.
   - Click **Create new project** and wait for provisioning to complete.

2. **Run Initial Schema**:
   - Navigate to the **SQL Editor** in the left sidebar.
   - Open the file `micro-donation-platform/backend/src/config/schema.sql` from this repository.
   - Copy all contents, paste them into the SQL Editor, and click **Run**.
   - Verify that all 7 tables are created: `users`, `email_tokens`, `password_reset_tokens`, `campaigns`, `campaign_files`, `campaign_updates`, and `donations`.

3. **Apply Database Migrations**:
   - In the SQL Editor, paste and run `micro-donation-platform/backend/src/config/migrations/005_email_verification.sql`.
   - In the SQL Editor, paste and run `micro-donation-platform/backend/src/config/migrations/006_password_reset.sql`.
   - *Note: These migrations add transactional verification functions and the `auth_version` column to the `users` table.*

4. **Retrieve API Credentials**:
   - In Supabase, navigate to **Project Settings** -> **API**.
   - Copy the **Project URL** (e.g., `https://xyzproject.supabase.co`).
   - Copy the **service_role (secret)** key.
   - *Security Notice*: The backend requires the `service_role` key to perform administrative database operations. **Never** expose this key in the frontend repository or public clients.

---

## Step 2: Razorpay Payment Gateway Setup

1. **Access Razorpay Dashboard**:
   - Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
   - Ensure the toggle in the header is set to **Test Mode**.

2. **Generate API Keys**:
   - Navigate to **Settings** -> **API Keys**.
   - Click **Generate Key**.
   - Save your **Key ID** (`rzp_test_xxxxxxxxxxxxxx`) and **Key Secret** safely.
   - *Key ID* is public and will be supplied to the frontend and backend.
   - *Key Secret* is strictly private and must only be configured in the backend environment.

3. **Configure Webhook (Optional for Local, Recommended for Production)**:
   - Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
   - Set Webhook URL to: `https://your-backend-domain.com/api/donations/webhook`
   - Select event: `payment.captured`.

---

## Step 3: Gmail SMTP Service Setup

To enable real OTP delivery, password reset emails, and donation receipts:

1. Enable **2-Step Verification** on your Google account at [Google Account Security](https://myaccount.google.com/security).
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Generate a new App Password named **MicroDonate Backend**.
4. Copy the generated 16-character password (e.g., `abcd efgh ijkl mnop`).
5. Set these credentials in the backend environment variables:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-address@gmail.com`
   - `SMTP_PASS=abcdefghijklmnop`
   - `EMAIL_FROM=your-address@gmail.com`

---

## Step 4: Backend Deployment (Render / Railway)

### Deploying on Render

1. **Create Web Service**:
   - Log in to [Render](https://dashboard.render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository: `https://github.com/NikhitaUppar/SE-project-Team10`.

2. **Configure Service Settings**:
   - **Name**: `micro-donation-backend`
   - **Region**: Singapore or nearest to your database
   - **Branch**: `main`
   - **Root Directory**: `micro-donation-platform/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: Free

3. **Configure Environment Variables**:
   In the **Environment** tab, add the following variables:

   | Variable Name | Example / Production Value | Description |
   |---|---|---|
   | `PORT` | `5000` | Port Express listens on (Render automatically manages `PORT`) |
   | `NODE_ENV` | `production` | Node execution environment |
   | `SUPABASE_URL` | `https://xyz.supabase.co` | Supabase cloud endpoint |
   | `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` | Supabase Service Role Secret Key |
   | `JWT_SECRET` | *64+ character random hex* | Secret key for signing HS256 auth tokens |
   | `JWT_EXPIRES_IN` | `7d` | Auth token expiration window |
   | `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay Test Key ID |
   | `RAZORPAY_KEY_SECRET` | `your-razorpay-secret` | Razorpay Test Key Secret |
   | `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP hostname |
   | `SMTP_PORT` | `587` | SMTP TLS Port |
   | `SMTP_USER` | `your-email@gmail.com` | Gmail sender account address |
   | `SMTP_PASS` | `16-char-app-password` | Google App Password |
   | `EMAIL_FROM` | `your-email@gmail.com` | Sender email address for outgoing mail |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Deployed frontend origin (for CORS whitelist) |

4. **Deploy**:
   - Click **Create Web Service**.
   - Once deployed, note down your backend URL (e.g., `https://micro-donation-backend.onrender.com`).
   - Test health endpoint: `https://micro-donation-backend.onrender.com/api/health` — should return `{"status":"ok"}`.

---

## Step 5: Frontend Deployment (Vercel / Netlify)

### Deploying on Vercel

1. **Import Project**:
   - Log in to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
   - Select your repository: `SE-project-Team10`.

2. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `micro-donation-platform/frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Configure Environment Variables**:
   Add the following environment variables in Vercel:

   | Variable Name | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://micro-donation-backend.onrender.com/api` | Deployed backend API base URL |
   | `VITE_RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay public test key ID |

4. **Configure Single Page Application (SPA) Routing**:
   To ensure React Router routes like `/campaigns/:id` or `/dashboard` do not return 404 on page refresh, add a `vercel.json` inside `micro-donation-platform/frontend/`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

5. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend assets and assign a live URL (e.g., `https://micro-donation-team10.vercel.app`).

---

## Step 6: Connecting Frontend and Backend

Once both services are provisioned:
1. Update the backend's `CLIENT_URL` environment variable on Render to match your live Vercel URL (e.g. `https://micro-donation-team10.vercel.app`).
2. Trigger a manual redeploy on Render so the new CORS whitelist takes effect.
3. Confirm that `VITE_API_URL` on Vercel points to your live backend's `/api` path with no trailing slash (e.g. `https://micro-donation-backend.onrender.com/api`).

---

## Step 7: Verification and Smoke Testing

Run through this complete verification checklist after deployment:

1. **Health Check**:
   - Open `https://your-backend-domain.com/api/health` in your browser.
   - Verify the response: `{"status": "ok"}`.

2. **Frontend Navigation & CORS**:
   - Open your deployed frontend URL.
   - Open Browser DevTools (F12) -> Console.
   - Ensure the home page loads statistics and verified campaigns without CORS errors.

3. **User Registration & OTP Email**:
   - Click **Register**, enter your name and a real email address.
   - Click **Send verification code**.
   - Check your inbox for the 6-digit verification code.
   - Complete verification, choose a password, and log in.

4. **Micro-Donation Flow (Razorpay Test Mode)**:
   - Browse campaigns, choose a campaign, and click **Donate Now**.
   - Test boundary amounts (e.g. ₹100).
   - Complete payment using Razorpay Test UPI / Netbanking / Card details.
   - Verify that the success screen appears and an email receipt arrives in your inbox.
   - Check the campaign progress bar to confirm the raised amount updated.

5. **Campaign Creation & Admin Approval**:
   - Submit a test campaign at `/campaigns/new` with a sample image or PDF proof document.
   - Log in as an admin account and open `/admin`.
   - Review proof documents and click **Approve Campaign**.
   - Verify the campaign transitions to `active` on the public `/campaigns` feed.

6. **Password Reset Flow**:
   - Click **Forgot password?** on the login page.
   - Enter your email and verify receipt of the reset link.
   - Follow the link, reset your password, and verify you can log in with the new password.

---

## Security and Credential Best Practices

> [!CAUTION]
> **Zero Credential Exposure Rule**:
> Never commit actual `.env` files, Supabase Service Role keys, Razorpay secret keys, or Gmail App Passwords to Git.

- **Git Tracking**: Confirm `.gitignore` in both `backend/` and `frontend/` ignores all `.env` and `.env.*` files (except `.env.example`).
- **Service Role Isolation**: Only the backend should ever hold `SUPABASE_SERVICE_KEY`. The frontend should only communicate with Supabase via the backend API.
- **Micro-Donation Boundaries**: The backend enforces `amount >= 1 AND amount <= 500` both at the database CHECK constraint level and Express route handler level.
- **CORS Whitelisting**: Ensure `CLIENT_URL` on the backend strictly matches the frontend production origin, avoiding wildcard (`*`) origins in production.
- **Signature Verification**: All payment completions must be validated using Razorpay HMAC SHA-256 signatures before updating donation records or issuing receipts.
