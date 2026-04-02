# Golf Charity Subscription Platform

Full-stack trainee assignment project built with:

- React.js (JavaScript) for the client
- Express.js for the server
- Supabase for the database
- Razorpay for payment-ready subscription wiring with a demo fallback

## Structure

```text
assignment/
  client/
  server/
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

2. Start the frontend:

   ```bash
   npm run dev --prefix client
   ```

3. Start the backend:

   ```bash
   npm run dev --prefix server
   ```

## Implemented So Far

- Public marketing pages and subscription entry flow
- Auth with subscriber/admin roles
- Supabase-backed data model
- Subscriber dashboard with charity selection and score entry
- Monthly draw engine with jackpot rollover logic
- Winner proof upload and admin review
- Admin dashboard tables for members, subscriptions, proofs, and draw history
- Razorpay integration path plus demo subscription fallback when payment config is missing

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase and run [server/database/schema.sql](C:\Users\user\Desktop\assignment\server\database\schema.sql).
   - If your database already had the `charity_selections` or `draws` tables, rerun the same `schema.sql` file to apply the missing columns.
3. Copy [server/.env.example](C:\Users\user\Desktop\assignment\server\.env.example) to `server/.env`.
4. Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. If you want to import the current local JSON dev data, run:

   ```bash
   npm run migrate:json-to-supabase --prefix server
   ```

The backend now uses Supabase as its database provider.

## Razorpay Setup

1. Create Razorpay plans for monthly and yearly subscriptions in the Razorpay dashboard.
2. Add these values to `server/.env`:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `RAZORPAY_PLAN_MONTHLY`
   - `RAZORPAY_PLAN_YEARLY`
3. If your `subscriptions` table was created before the Razorpay columns were added, run [server/database/razorpay_subscription_columns.sql](C:\Users\user\Desktop\assignment\server\database\razorpay_subscription_columns.sql) in Supabase.
4. Configure your Razorpay webhook endpoint as:

   ```text
   http://localhost:4000/api/razorpay/webhook
   ```

If Razorpay is not fully configured yet, the app now falls back to a demo subscription mode so the rest of the website remains usable for review.

## Deployment Prep

This repo now includes [render.yaml](C:\Users\user\Desktop\assignment\render.yaml) so you can deploy both services on Render:

- `golf-charity-api` for the Express backend
- `golf-charity-web` for the React frontend

### Backend env vars

Set these in the Render web service:

- `CLIENT_URL`
  You can use a comma-separated list if you want both local and deployed frontends allowed, for example:
  `http://localhost:5173,https://your-frontend.onrender.com`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_MONTHLY`
- `RAZORPAY_PLAN_YEARLY`

### Frontend env vars

Set this in the Render static site:

- `VITE_API_URL`
  Example: `https://your-api-service.onrender.com/api`

### Static routing

The React app now includes [client/public/_redirects](C:\Users\user\Desktop\assignment\client\public\_redirects) so direct refreshes on routes like `/dashboard`, `/admin`, and `/subscribe` keep working on Render static hosting.

### Recommended order

1. Deploy the backend first.
2. Copy the backend public URL into the frontend `VITE_API_URL`.
3. Update backend `CLIENT_URL` to the frontend public URL.
4. Add the production webhook URL in Razorpay:
   `https://your-api-service.onrender.com/api/razorpay/webhook`
5. Re-test signup, demo/live subscription flow, score entry, draw run, and proof review after deploy.

## Vercel Deployment

Vercel is a great fit for this monorepo using two separate projects (API and frontend). Use either Dashboard or CLI steps below.

### Option A: Vercel Dashboard

1. Go to vercel.com and create/import project from Git repository.
2. For the backend project:
   - Root Directory: `server`
   - Framework Preset: `Other` (Node)
   - Build Command: `npm run build` (if exists) or none
   - Output Directory: (none, uses Express as API)
3. For the frontend project:
   - Root Directory: `client`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add required environment variables for each project (see below).

### Option B: Vercel CLI (quick start)

From the repository root:

```bash
npm i -g vercel
cd server
vercel --prod --confirm --name golf-charity-backend
cd ../client
vercel --prod --confirm --name golf-charity-frontend
```

Then set env vars via CLI (example):

```bash
vercel env add production SUPABASE_URL "https://..."
vercel env add production SUPABASE_SERVICE_ROLE_KEY "..."
vercel env add production VITE_API_URL "https://golf-charity-backend.vercel.app/api"
```

### Required env vars

Backend (`server` project):
- `CLIENT_URL` (e.g. `https://golf-charity-frontend.vercel.app`)
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROOF_BUCKET` (optional, default: `proof-uploads`)
- `RAZORPAY_KEY_ID` (optional demo fallback)
- `RAZORPAY_KEY_SECRET` (optional demo fallback)
- `RAZORPAY_WEBHOOK_SECRET` (optional demo fallback)
- `RAZORPAY_PLAN_MONTHLY` (optional demo fallback)
- `RAZORPAY_PLAN_YEARLY` (optional demo fallback)

Frontend (`client` project):
- `VITE_API_URL` (e.g. `https://golf-charity-backend.vercel.app/api`)

### SPA routing

`client/vercel.json` is included for redirects so routes like `/dashboard` and `/admin` work on refresh in frontend static hosting.

### Proof uploads

Winner proof files are stored in Supabase Storage (not local disk), which is compatible with Vercel serverless deployment.

### Post-deploy checks

1. Visit frontend URL and signup/login.
2. Validate API endpoints with `/api` path.
3. Confirm `clientUrl` is correctly set in backend (for CORS).
4. Run a test subscription or demo flows.

> If the app is already running locally, run `npm run dev --prefix client` and `npm run dev --prefix server` before pushing to Vercel to verify features first.

