-- Foreman: 1:1 coaching session credits (the Coach tab's "book a session
-- with Cayden"). Run via Supabase SQL editor or `supabase db push`.
--
-- Business rule: every user's FIRST session is free (kind='free', one per
-- user, enforced by the partial unique index). After that each purchase
-- through Stripe checkout grants one 'paid' credit. Scheduling itself
-- happens on the external booking link; credits here are the ledger.

create table if not exists coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('free', 'paid')),
  stripe_payment_intent_id text,
  amount_paid_cents int,
  created_at timestamptz default now()
);

-- One free session per user, ever.
create unique index if not exists idx_coaching_sessions_one_free
  on coaching_sessions (user_id) where kind = 'free';

create index if not exists idx_coaching_sessions_user
  on coaching_sessions (user_id, created_at desc);

-- Users may read their own credits; all writes go through the service role
-- (claim-free route + Stripe webhook).
alter table coaching_sessions enable row level security;

drop policy if exists "users read own coaching_sessions" on coaching_sessions;
create policy "users read own coaching_sessions" on coaching_sessions
  for select using (auth.uid() = user_id);
