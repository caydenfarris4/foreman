# Foreman

A daily coaching app for first-time managers, built on the *Under
Construction* framework: **foundation, framing, finishing.**

## Stack

- Next.js 15 (App Router, TypeScript strict)
- Tailwind CSS + shadcn-style UI components
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude (`claude-sonnet-4-6`) for coaching and weekly synthesis
- Resend for transactional email *(phase 5)*
- Stripe Checkout for billing *(phase 6)*
- Cloudflare Workers hosting (via OpenNext) + GitHub Actions cron

## Deploying

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for the step-by-step production
checklist, and **[docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)** for the hosting
details. Run `npm run preflight` first to confirm every required env var is set.

## Build phases

The build follows the order in the original product brief:

1. ✅ Auth + profiles + onboarding (working end-to-end)
2. ✅ Daily check-in with Claude integration, auto-library
3. ✅ Situation library + retrieval (FTS, pagination, edit/delete, notes, export)
4. ✅ Weekly retrospective (history, monthly synthesis, skip, carry-over, retro-day email)
5. ✅ GitHub Actions cron + Resend daily prompt emails
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

## Sabbath pause

The check-in route and dashboard both check the user's `sabbath_day` against
the current weekday in their `timezone`. On the sabbath, the prompt UI is
replaced with a rest message; the cron route (phase 5) skips them entirely.

## Daily prompt email cron

A GitHub Actions workflow (`.github/workflows/cron-daily-prompts.yml`) calls
`GET /api/cron/daily-prompts` every hour. The handler:

1. Authenticates against `Bearer ${CRON_SECRET}` (the workflow sends this).
2. Pulls every onboarded profile whose `subscription_status` is `trial` or
   `active` (service-role client — bypasses RLS).
3. For each profile, computes the current hour in their timezone and skips
   anyone whose `notification_time` hour doesn't match.
4. Skips anyone whose weekday-in-timezone matches their `sabbath_day`.
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
