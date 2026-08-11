# Foreman

A daily coaching app for first-time managers, built on the *Under
Construction* framework: **foundation, framing, finishing.**

The book is live: [*Under Construction* on Amazon](https://www.amazon.com/Under-Construction-Leadership-Principles-First-Time/dp/B0H76DT3DM).

## Stack

- Next.js 15 (App Router, TypeScript strict)
- Tailwind CSS + shadcn-style UI components
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude (`claude-sonnet-4-6`) for coaching and weekly synthesis
- Resend for transactional email *(phase 5)*
- Stripe Checkout for billing *(phase 6)*
- Vercel hosting + Vercel Cron

## Build phases

The build follows the order in the original product brief:

1. ✅ Auth + profiles + onboarding (working end-to-end)
2. ✅ Daily check-in with Claude integration, auto-library
3. ✅ Situation library + retrieval (FTS, pagination, edit/delete, notes, export)
4. ✅ Weekly retrospective (history, monthly synthesis, skip, carry-over, retro-day email)
5. ✅ Vercel Cron + Resend daily prompt emails
6. ✅ Stripe billing + paywall after trial
7. ✅ Marketing landing page polish

## Local setup

```bash
cp .env.example .env.local            # fill in keys
npm install
# Apply the schema to your Supabase project:
#   supabase db push  (or paste supabase/migrations/0001_init.sql in the SQL editor)
npm run dev
```

## Testing

```bash
npm test            # unit tests (Vitest) — pure logic, security-critical
npm run test:coverage
npm run test:e2e    # Playwright core flows (login, auth gate, headers)
```

Unit tests cover input validation/sanitizers, the paywall gates, governance
validators, the fixed principle vocabulary, the AI JSON parsers, and the login
helpers. E2E covers the login screen, the unauthenticated redirect gate, public
pages, and security headers. Both run in CI (`.github/workflows/ci.yml`) on
every push/PR to `main`.

E2E runs against a built local server by default (needs `NEXT_PUBLIC_SUPABASE_*`
in the environment), or against a deployment:
`PLAYWRIGHT_BASE_URL=https://foreman.coach npm run test:e2e`.

## Security

See [`SECURITY.md`](./SECURITY.md) for the control inventory and threat model
(data isolation via RLS, the login-screen hardening, injection defenses,
webhook verification, rate limiting, and the SOC 2 roadmap).

## Environment variables

See `.env.example`. The minimum to run phases 1-2:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## Project structure

```
app/
  page.tsx                       marketing landing
  signup, login, auth/callback   Supabase auth
  onboarding/                    5-step profile wizard (server actions)
  app/                           authed shell
    page.tsx                     dashboard (today, streak, recent insight)
    checkin/                     daily check-in + Claude coaching
    library/                     situation library (list + detail)
    retro, settings              stubs for phases 4 and 6
  api/checkin/submit             Claude call, save check-in + situation
lib/
  supabase/                      server + browser + middleware clients
  prompts.ts                     COACHING_SYSTEM_PROMPT + retro prompt
  prompts/daily.ts               90 prompts (30 per phase) + rotation
  anthropic.ts                   Anthropic client, JSON parsers, fallback
  database.types.ts              hand-written DB types
supabase/migrations/0001_init.sql
docs/under-construction.txt       source book — coaching reference
```

## Sabbath reflection

The sabbath is not a pause. On the user's `sabbath_day` (checked against the
current weekday in their `timezone`), the coaching check-in is replaced with a
**reflection day** focused on faith, reflection, personal growth, and
meditation. The dashboard and the check-in route render a reflection prompt
(`lib/prompts/reflection.ts`) instead of the managerial prompt, and the cron
route sends a reflection email (`lib/emails/reflection-prompt.ts`) instead of
skipping. Reflections are contemplative: nothing is submitted, so they stay out
of streaks, the library, and the weekly retro.

## Daily prompt email cron

`vercel.json` schedules `GET /api/cron/daily-prompts` every hour on the hour
(`0 * * * *`). The handler:

1. Authenticates against `Bearer ${CRON_SECRET}` (Vercel Cron sends this).
2. Pulls every onboarded profile whose `subscription_status` is `trial` or
   `active` (service-role client — bypasses RLS).
3. For each profile, computes the current hour in their timezone and skips
   anyone whose `notification_time` hour doesn't match.
4. On the user's `sabbath_day`, sends a **reflection** email instead of the
   coaching prompt (no `daily_checkins` row is written for it).
5. Skips anyone who has already completed today's check-in.
6. Otherwise, *locks in today's prompt by inserting the `daily_checkins`
   row*, then sends the email via Resend. The row creation is the
   idempotency guard: if the cron runs twice in the same hour for some
   reason, the unique `(user_id, checkin_date)` constraint prevents a
   double-insert and the second run skips the send.

The HTML email matches the design system (oak rule, italic serif prompt,
inked CTA). Plain-text fallback included.

## Daily prompt rotation

`promptForDay(phase, date, userId)` indexes the user into the 30-prompt list
for their current phase. Same date + same user always returns the same
prompt. Two users on the same date will see different prompts (salted by
`userId`).

## Coaching contract

The Claude call must return JSON of the shape:

```json
{
  "phase": "foundation" | "framing" | "finishing",
  "tags": ["..."],
  "coaching": "Paragraphs of coaching, under 250 words.",
  "title": "Short noun phrase for the library"
}
```

If parsing fails, the raw text is stored as coaching (best-effort). If the
Claude call fails entirely, `COACHING_FALLBACK` is stored and no situation
row is created (so the failure doesn't pollute the library).
