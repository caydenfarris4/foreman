# Hosting on Cloudflare Workers

The app runs on Cloudflare Workers via the [OpenNext Cloudflare
adapter](https://opennext.js.org/cloudflare). Compute/hosting moves to Workers;
**Supabase stays the database + auth**, and Upstash (rate limiting) and the
GitHub Actions cron jobs are unchanged (both are host-agnostic and already
Workers-compatible).

## Files

- `wrangler.jsonc` — Worker config (name, `nodejs_compat`, assets binding).
- `open-next.config.ts` — OpenNext build config (cache overrides go here).
- `next.config.ts` — calls `initOpenNextCloudflareForDev()` for local bindings.
- `.dev.vars.example` — template for local Worker secrets (copy to `.dev.vars`).

## Local commands

```bash
npm run dev        # normal Next.js dev server
npm run cf-build   # build the Worker bundle (.open-next/worker.js)
npm run preview    # build + run the Worker locally (workerd)
npm run cf-typegen # regenerate cloudflare-env.d.ts from wrangler.jsonc
```

## Env vars: build-time vs runtime (important)

Next.js **inlines `NEXT_PUBLIC_*` at build time**, so those must be present when
the build runs, not as runtime secrets. Everything else is read by the Worker at
request time and must be a runtime secret.

- **Build-time** (set in the Workers Builds *build* variables):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_APP_URL`
- **Runtime secrets** (set as the Worker's encrypted Variables & Secrets):
  `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `CRON_SECRET`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Deploy: GitHub-connected (Workers Builds) — chosen path

1. **Connect the repo.** CF dashboard → Workers & Pages → Create →
   *Workers* → **Connect to Git** → pick `caydenfarris4/foreman` and the
   branch you want to deploy (set this as the production branch).
2. **Build settings:**
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: repo root (leave default)
3. **Build variables:** add the three `NEXT_PUBLIC_*` build-time vars above.
4. **First deploy** runs automatically. You get a `*.workers.dev` URL.
5. **Runtime secrets:** Worker → Settings → Variables and Secrets → add each
   runtime secret above (mark as *Secret*). Re-deploy to pick them up.
6. **Custom domain:** Worker → Settings → Domains & Routes → add your domain.
   Then set `NEXT_PUBLIC_APP_URL` to that domain and trigger a rebuild.
7. **Point external callbacks at the new URL:**
   - Supabase Auth: add the Workers/custom URL to allowed redirect URLs.
   - Stripe webhook: point it at `https://<your-domain>/api/stripe/webhook`.
   - GitHub Actions cron: update the target URL in
     `.github/workflows/cron-*.yml` to the new domain.

After setup, **every push to the connected branch builds and deploys**.

## Alternative: manual CLI deploy

`npx wrangler login`, set runtime secrets with `npx wrangler secret put <NAME>`,
keep `NEXT_PUBLIC_*` in `.env.local`, then `npm run deploy`.

## Optional: R2 incremental cache

Most routes here are dynamic (auth-gated), so the cache is not required. If you
add cached/ISR routes later:

1. `npx wrangler r2 bucket create foreman-cache`
2. Uncomment the `r2_buckets` binding in `wrangler.jsonc`.
3. Enable `r2IncrementalCache` in `open-next.config.ts`.

## Notes

- `nodejs_compat` is required: the cron routes use `node:crypto` and the
  Stripe / Anthropic / Supabase SDKs expect Node built-ins.
- Cloudflare Workers is the only hosting target. The old `vercel.json` has been
  removed; deploys go through `npm run deploy` (OpenNext + `wrangler deploy`) or
  the GitHub-connected Workers Builds path above. The scheduled emails run on
  GitHub Actions cron (`.github/workflows/cron-*.yml`), not Vercel Cron.
