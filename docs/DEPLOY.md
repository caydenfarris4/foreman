# Deploying Foreman to production

This is the turnkey, do-it-in-order checklist for taking Foreman live on
Cloudflare Workers with Supabase as the database. `docs/CLOUDFLARE.md` has the
deeper "why" behind each step; this is the "do this, then this."

The code is already deploy-ready — `npm run typecheck`, `npm run build`, and
`npm run cf-build` all pass on the production branch. Everything below is
account/config setup that lives in your dashboards, not in the repo.

> **Production branch:** pick the branch Cloudflare watches. Today the live work
> is on `claude/foreman-deployment-status-0ph31z`; once it merges to `main`,
> point Cloudflare at `main`. Every push to that branch auto-builds and deploys.

---

## 0. Preflight (local, 1 min)

Fill in `.env.local` (copy from `.env.example`), then:

```bash
npm install
npm run preflight   # checks every required env var is present
npm run build       # sanity: full Next.js build
```

`preflight` is the same contract Cloudflare needs — green here means you have
every value ready to paste into the dashboard.

---

## 1. Supabase (database + auth)

1. Create a Supabase project (or use the existing one).
2. Apply migrations in order. Either:
   - `supabase db push` (if the CLI is linked to the project), **or**
   - paste each file in `supabase/migrations/0001…0007` into the SQL editor,
     oldest first. `0006_growth_inspection.sql` and `0007_profile_is_admin.sql`
     are additive and safe to run on an existing DB.
3. Copy these from Project Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)
4. Auth → URL Configuration: add your future Workers URL and custom domain to
   **Redirect URLs** (you'll get the Workers URL in step 2; come back and add it).

## 2. Cloudflare Workers (hosting)

1. Dashboard → Workers & Pages → **Create** → Workers → **Connect to Git**.
2. Pick `caydenfarris4/foreman`, set the **production branch** (see note above).
3. Build settings:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: default (repo root)
4. **Build variables** (these get inlined at build time — must be set here, not
   as secrets):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (use the `*.workers.dev` URL for now; update after
     step 5 if you add a custom domain)
5. First build runs automatically → you get a `https://foreman.<subdomain>.workers.dev`
   URL. Put it in `NEXT_PUBLIC_APP_URL` and in Supabase redirect URLs (step 1.4).

## 3. Runtime secrets (Cloudflare → Worker → Settings → Variables and Secrets)

Add each as a **Secret** (encrypted), then redeploy to pick them up:

| Secret | Where it comes from |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API settings |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `RESEND_API_KEY` | resend.com |
| `RESEND_FROM_EMAIL` | e.g. `Foreman <noreply@yourdomain>` (domain must be verified in Resend) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | from step 4 below |
| `STRIPE_PRICE_MONTHLY` | Stripe price ID for the monthly plan |
| `STRIPE_PRICE_YEARLY` | Stripe price ID for the yearly plan |
| `CRON_SECRET` | any strong random string (reused in step 5) |
| `UPSTASH_REDIS_REST_URL` | upstash.com (rate limiting — set in prod) |
| `UPSTASH_REDIS_REST_TOKEN` | upstash.com |

## 4. Stripe (billing)

1. Create the two recurring Prices (monthly + yearly); copy their IDs into the
   secrets above.
2. Developers → Webhooks → add endpoint:
   `https://<your-domain>/api/stripe/webhook`
3. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`, redeploy.

## 5. GitHub Actions cron (daily prompt + weekly retro emails)

The two workflows in `.github/workflows/cron-*.yml` ping the live app. In the
GitHub repo settings:

1. Settings → Secrets and variables → Actions → **Variables**: add `APP_URL` =
   your production URL (no trailing slash).
2. Same screen → **Secrets**: add `CRON_SECRET` = the exact value from step 3.
3. Trigger each workflow once via **Run workflow** to confirm a `200`.

## 6. Custom domain (optional)

Worker → Settings → Domains & Routes → add your domain. Then update
`NEXT_PUBLIC_APP_URL` (build var) and the GitHub `APP_URL` variable to the
custom domain, update Supabase redirect URLs and the Stripe webhook URL, and
trigger a rebuild.

---

## Post-deploy smoke test

1. Visit the production URL → landing page loads.
2. Sign up → confirm email → land in onboarding → complete the 5-step wizard.
3. Submit a daily check-in → Claude coaching renders, situation saved to library.
4. Hit `/app/upgrade` → Stripe Checkout opens.
5. Manually run both cron workflows → both return `200`.

If all five pass, you're live.
