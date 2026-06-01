# scripts

## seed-demo.mjs — full-access demo account

Creates (or refreshes) one demo user for manual testing and fills every feature
surface with realistic data.

What it gives you:

- a confirmed login you can use immediately
- profile fully onboarded, **active subscription** (no paywall), **is_admin = true**
- existing spine seeded: daily check-ins, situations + notes, a weekly retro, a
  monthly synthesis
- growth-inspection spine seeded: a versioned plan, weighted principles + AI
  mapping, the full six-level goal cascade (including one deliberately
  disconnected goal), cascade check-ins with goal completions, and a sent
  baseline inspection
- a small global inspection question bank

### Prerequisites

1. Apply the migrations to your Supabase project first (through `0007`):
   `supabase db push`, or paste each `supabase/migrations/*.sql` into the SQL
   editor in order.
2. Have these in `.env.local` (or the environment):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  (service role — bypasses RLS; keep it secret)

### Run

```bash
npm run seed:demo
# or
node scripts/seed-demo.mjs
```

Default credentials (override with env vars):

```
email:    demo@foreman.app
password: ForemanDemo!2026
```

```bash
DEMO_EMAIL=you@example.com DEMO_PASSWORD='Sup3rSecret!' npm run seed:demo
```

### Notes

- **Idempotent.** Re-running wipes only the demo user's data rows and reseeds
  them. It never touches other users.
- **Local/testing only.** The account bypasses billing and is flagged admin, so
  the script refuses to run when `NODE_ENV=production` unless you pass `--force`.
  Do not seed this into a production database.
- Most growth-inspection **screens** do not exist yet (Stages 2-8). The seeded
  rows are visible now in the Supabase table editor (`growth_plans`,
  `growth_goals`, `inspections`, ...) and give those screens content the moment
  they land.
