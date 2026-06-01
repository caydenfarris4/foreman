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

## First-time deploy (your steps — needs your Cloudflare account)

1. **Auth the CLI:** `npx wrangler login`
2. **Set production secrets** (everything currently in your Vercel env). Each:
   ```bash
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put RESEND_FROM_EMAIL
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put STRIPE_PRICE_MONTHLY
   npx wrangler secret put STRIPE_PRICE_YEARLY
   npx wrangler secret put CRON_SECRET
   npx wrangler secret put NEXT_PUBLIC_APP_URL
   npx wrangler secret put UPSTASH_REDIS_REST_URL
   npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
   ```
   (`NEXT_PUBLIC_*` values are also inlined at build time, so keep them in your
   build environment too.)
3. **Deploy:** `npm run deploy`
4. **Custom domain:** add a route/custom domain to the Worker in the Cloudflare
   dashboard (Workers & Pages → your worker → Settings → Domains & Routes).
5. **Point external callbacks at the new URL:**
   - Supabase Auth: add the Workers URL to the allowed redirect URLs.
   - Stripe webhook: point it at `https://<your-domain>/api/stripe/webhook`.
   - GitHub Actions cron: update the target URL in
     `.github/workflows/cron-*.yml` to the Workers domain.

## Optional: R2 incremental cache

Most routes here are dynamic (auth-gated), so the cache is not required. If you
add cached/ISR routes later:

1. `npx wrangler r2 bucket create foreman-cache`
2. Uncomment the `r2_buckets` binding in `wrangler.jsonc`.
3. Enable `r2IncrementalCache` in `open-next.config.ts`.

## Notes

- `nodejs_compat` is required: the cron routes use `node:crypto` and the
  Stripe / Anthropic / Supabase SDKs expect Node built-ins.
- The Vercel config (`vercel.json`, currently empty) is left in place; this
  migration is additive and does not break a Vercel deploy.
