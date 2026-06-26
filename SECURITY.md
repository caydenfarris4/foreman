# Security Overview

This document inventories the security controls in Foreman and the threat model
for the most sensitive surfaces. It is intended both as engineering reference
and as evidence toward SOC 2 readiness. Controls are enforced in code and, where
possible, locked in by automated tests (`npm test`, `npm run test:e2e`).

## Data isolation (the core control)

Every customer-data table enforces **Postgres Row-Level Security**. Policies are
`auth.uid() = user_id` (see `supabase/migrations/*.sql`), so the database itself
refuses to return one user's rows to another, independent of any application
bug. The service-role key (which bypasses RLS) is used **only** server-side in
trusted contexts — the cron route and the Stripe webhook — never in a client or
edge path (`lib/supabase/admin.ts`).

Reports and inspection drafts are additionally gated: users can read only their
own **sent** inspections, so AI drafts and "hard notes" never reach a user
before review.

## Authentication & the login screen (priority surface)

The login screen is the first and highest-value target (credential stuffing,
account enumeration, reflected-input attacks, open redirect). Its security
logic is extracted into `lib/auth/login.ts` and unit-tested
(`tests/unit/auth-login.test.ts`), plus driven end-to-end
(`tests/e2e/login.spec.ts`).

Controls:

- **No account enumeration.** Every failed login returns the same generic
  message ("Invalid email or password"). The login screen never reveals whether
  an email is registered or whether the password specifically was wrong.
  `isEmailNotConfirmedError` is the *only* branch that differs, and it triggers
  only for an already-known unconfirmed account (a deliberate UX trade-off, see
  Accepted risks).
- **Input bounding.** Credentials are shape-checked (`credentialsWellFormed`)
  before they ever reach the auth provider: non-empty, and within
  `EMAIL_MAX_LEN` / `PASSWORD_MAX_LEN`. Oversized payloads are rejected locally.
- **No secret logging.** The action logs `error.message` only — never the email
  body or password.
- **Reflected-value safety.** The `?email=` hint is filtered to email-shaped
  values and length-capped (`safeEmailHint`); `?error=` is rendered as React
  text (auto-escaped). An e2e test asserts a `<img onerror=...>` payload in the
  query string does not execute and does not enter the DOM as markup.
- **CSRF.** Login and signup use Next.js Server Actions, which enforce
  same-origin POST checks by default.
- **Open redirect.** The login action ignores any attacker-supplied `next` and
  routes only to `/app` or `/onboarding`. Signup/`auth/callback` validate `next`
  with `isSafeRedirectPath` (blocks `//host`, `/\host`, absolute URLs, CRLF).
- **Brute force.** Supabase Auth rate-limits `signInWithPassword` upstream.
  (App-level login throttling is on the roadmap as defense-in-depth.)
- **Transport.** Login is served over TLS (Cloudflare) with HSTS
  (`Strict-Transport-Security`, two years, `includeSubDomains; preload`).

Session refresh and route gating live in `middleware.ts` /
`lib/supabase/middleware.ts`, which **fail closed**: an unauthenticated request
to any `/app/*` or `/onboarding` route is redirected to `/login`
(asserted in `tests/e2e/login.spec.ts`).

## Injection defenses

- **Parameterized queries everywhere.** All data access uses the Supabase
  query builder (`.eq`, `.insert`, `.range`, `.textSearch`) with bound values —
  no string-concatenated SQL.
- **Search inputs are sanitized.** Library search whitelists characters before
  they touch a PostgREST `.or()` filter or `websearch_to_tsquery`
  (`sanitizeSearchTerm`, `sanitizeFtsQuery`, `sanitizeTag` in `lib/validation.ts`),
  and filters are whitelisted (`phase`) or format-checked (`isIsoDate`,
  bounded `page`). Unit-tested in `tests/unit/validation.test.ts`.
- **AI output cannot widen the schema.** `parseMappingJson` drops anything
  outside the fixed eleven principles / three layers; the governance validators
  reject malformed report prose. Unit-tested.
- **No raw HTML from user data.** React escapes all interpolated values; the
  one regex over user input (search highlighting) escapes regex metacharacters.

## Webhooks & external input

The Stripe webhook verifies the signature via `stripe.webhooks.constructEvent`
before any handler runs, and resolves the user by `client_reference_id` /
metadata or a customer-id lookup (`app/api/stripe/webhook/route.ts`). The cron
route authenticates with a constant-time compare against `CRON_SECRET` and fails
closed if the secret is unset.

## Rate limiting

User-facing API routes call `enforceRateLimit` (Upstash sliding window, 5 req /
15 min per IP) and **fail closed in production** if the limiter is
misconfigured (`lib/rate-limit.ts`).

## Secrets management

No secrets in the repo. Local dev uses `.env.local` / `.dev.vars` (both
gitignored); production uses Cloudflare Worker secrets. `NEXT_PUBLIC_*` values
are non-secret by definition (anon key + URLs). The Supabase service-role key
and Stripe secret never appear in client bundles.

## Error handling & disclosure

User-facing errors are generic; internal detail goes to server logs only
(monthly synthesis, checkout, login, webhook). Login avoids account enumeration
as above.

## Browser-hardening headers

Set globally in `next.config.ts` and asserted in
`tests/e2e/security-headers.spec.ts`: `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and
`Strict-Transport-Security`.

## Testing & change management

- **Unit** (`npm test`, Vitest): validation/sanitizers, billing/paywall gates,
  governance validators, the fixed principle vocabulary, AI JSON parsers, the
  login helpers, and prompt rotation.
- **E2E** (`npm run test:e2e`, Playwright): login security, the auth gate,
  public pages, and security headers.
- **CI** (`.github/workflows/ci.yml`): typecheck + unit + build, and the e2e
  suite, on every push/PR to `main`. CI has read-only repo permissions.

## Accepted risks / roadmap

- **Unconfirmed-account signal.** The login screen tells an *unconfirmed* user
  to confirm their email, which reveals existence for that narrow case. This is
  a deliberate UX trade-off; revisit if enumeration risk outweighs the UX gain.
- **Content Security Policy.** Not yet enforced. A nonce-based CSP should be
  added and validated against the real app before shipping (a wrong policy
  silently breaks the UI, so it is intentionally not enabled blind).
- **App-level login throttling.** Currently relies on Supabase upstream limits;
  add an IP/account throttle as defense-in-depth.
- **Admin authorization.** The `is_admin` flag exists but the Growth Inspection
  review queue (`review_queue_items`) is service-role-only for now; a real admin
  authz policy is required before that surface ships (tracked in
  `docs/growth-inspection/OVERLAPS.md`).
- **Audit logging.** No structured audit trail of admin/data-access events yet;
  needed for full SOC 2 coverage.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not open
a public issue for security reports.
