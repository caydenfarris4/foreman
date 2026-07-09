-- Foreman: Journal entries + daily habit checklist (Cornerstone overhaul).
-- Run via Supabase SQL editor or `supabase db push`.
--
-- journal_entries — free reflections, optionally seeded by the day's prompt.
-- daily_habits + habit_checks — small no-writing daily goals ("made my bed")
-- shown as checkboxes on the daily check-in.

-- ---------- journal_entries -------------------------------------------------

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  prompt_text text,
  body text not null,
  tag text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_journal_entries_user_date
  on journal_entries (user_id, entry_date desc, created_at desc);

create trigger journal_entries_updated_at_trg
  before update on journal_entries
  for each row execute function public.set_current_updated_at();

-- ---------- daily_habits (the user's checklist definition) ------------------

create table if not exists daily_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_daily_habits_user
  on daily_habits (user_id) where active;

-- ---------- habit_checks (one row per habit per day, when checked) ----------

create table if not exists habit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  habit_id uuid not null references daily_habits(id) on delete cascade,
  check_date date not null,
  created_at timestamptz default now(),
  unique (habit_id, check_date)
);

create index if not exists idx_habit_checks_user_date
  on habit_checks (user_id, check_date desc);

-- ---------- RLS (mirrors 0001: users reach only their own rows) --------------

alter table journal_entries enable row level security;
alter table daily_habits enable row level security;
alter table habit_checks enable row level security;

drop policy if exists "users access own journal_entries" on journal_entries;
create policy "users access own journal_entries" on journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own daily_habits" on daily_habits;
create policy "users access own daily_habits" on daily_habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own habit_checks" on habit_checks;
create policy "users access own habit_checks" on habit_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
