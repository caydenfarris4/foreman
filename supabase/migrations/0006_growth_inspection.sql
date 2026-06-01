-- Foreman: Growth Inspection spine (Stage 1 — data model).
--
-- Source of truth: docs/growth-inspection/BUILD_SPEC.md §7 (data model) and
-- the GOVERNANCE_FRAMEWORK.md. This migration is ADDITIVE: it stands alongside
-- the existing daily_checkins / weekly_retros / monthly_syntheses spine, which
-- is intentionally left untouched (see docs/growth-inspection/OVERLAPS.md for
-- the "decide later" reconciliation notes).
--
-- Naming note: the spec's "check-in" (goal-completion tracking) is a different
-- mechanic from the app's existing daily_checkins (AI coaching prompts). To
-- avoid collision, the new table is `cascade_checkins`.

-- Shared updated_at trigger for the mutable tables below. (weekly_retros has
-- its own copy of this pattern from migration 0005; this is a generic one so
-- the new tables don't depend on that function's name.)
create or replace function public.set_current_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- growth_plans (Plan, with version history) -----------------------

create table if not exists growth_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  version int not null default 1,
  ten_year_text text not null,
  five_year_text text,
  six_month_milestone text,
  is_current boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, version)
);

-- At most one current plan per user.
create unique index if not exists idx_growth_plans_one_current
  on growth_plans (user_id) where is_current;

create trigger growth_plans_updated_at_trg
  before update on growth_plans
  for each row execute function public.set_current_updated_at();

-- ---------- principle_selections (the chosen weighted 2 to 4) ---------------

create table if not exists principle_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references growth_plans(id) on delete cascade,
  principle text not null check (principle in (
    'foundation','framing','mentorship','reconciliation','belief','patience',
    'integrity','refinement','culture','discernment','pressure'
  )),
  created_at timestamptz default now(),
  unique (plan_id, principle)
);

-- ---------- principle_mappings (AI plan->principle map + user confirmation) -

create table if not exists principle_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references growth_plans(id) on delete cascade,
  principle text not null check (principle in (
    'foundation','framing','mentorship','reconciliation','belief','patience',
    'integrity','refinement','culture','discernment','pressure'
  )),
  layer text check (layer in ('foundation','frame','finish')),
  ai_rationale text,
  -- 'ai' = produced by the mapping model; 'user' = user override/correction.
  source text not null default 'ai' check (source in ('ai','user')),
  -- The user always has final say (GOVERNANCE Part 8); confirmed marks accept.
  confirmed boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_principle_mappings_plan
  on principle_mappings (plan_id);

-- ---------- growth_goals (the six-level cascade) ----------------------------

create table if not exists growth_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references growth_plans(id) on delete set null,
  level text not null check (level in (
    'ten_year','five_year','six_month','monthly','weekly','daily'
  )),
  parent_goal_id uuid references growth_goals(id) on delete set null,
  body text not null,
  status text not null default 'open' check (status in ('open','done','dropped')),
  period_start date,
  period_end date,
  -- false flags a "disconnected goal" (BUILD_SPEC §4.4). Never blocks the user.
  ladders_up boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_growth_goals_user_level
  on growth_goals (user_id, level);
create index if not exists idx_growth_goals_parent
  on growth_goals (parent_goal_id);

create trigger growth_goals_updated_at_trg
  before update on growth_goals
  for each row execute function public.set_current_updated_at();

-- ---------- cascade_checkins (daily/weekly/monthly goal-completion) ----------

create table if not exists cascade_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  checkin_type text not null check (checkin_type in ('daily','weekly','monthly')),
  -- The day, week-start, or month-start this check-in covers.
  period_date date not null,
  reflection text,
  created_at timestamptz default now(),
  unique (user_id, checkin_type, period_date)
);

create index if not exists idx_cascade_checkins_user_date
  on cascade_checkins (user_id, period_date desc);

-- Which goals were marked complete in a given check-in. This completion
-- history is the behavioral anchor the six-month inspection reads
-- (GOVERNANCE Part 5.2). user_id is denormalized for simple RLS.
create table if not exists cascade_checkin_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  checkin_id uuid not null references cascade_checkins(id) on delete cascade,
  goal_id uuid not null references growth_goals(id) on delete cascade,
  completed boolean not null default false,
  created_at timestamptz default now(),
  unique (checkin_id, goal_id)
);

create index if not exists idx_cascade_checkin_goals_checkin
  on cascade_checkin_goals (checkin_id);

-- ---------- inspection_questions (global question bank) ---------------------

create table if not exists inspection_questions (
  id uuid primary key default gen_random_uuid(),
  -- Stable key so rotation logic can reference a question across edits.
  question_key text not null unique,
  body text not null,
  qtype text not null check (qtype in ('slider','frequency','scenario')),
  -- Frame-layer questions name a principle; foundation/finish may be null.
  principle text check (principle in (
    'foundation','framing','mentorship','reconciliation','belief','patience',
    'integrity','refinement','culture','discernment','pressure'
  )),
  layer text not null check (layer in ('foundation','frame','finish')),
  -- 'weighted' = full coverage for chosen principles; 'light' = single rotated
  -- reading for the rest (BUILD_SPEC §4.3).
  weight_tier text not null default 'light' check (weight_tier in ('weighted','light')),
  rotation_group int,
  -- Options for scenario questions: [{ body, signal }]. Null for other types.
  scenario_options jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_inspection_questions_layer
  on inspection_questions (layer) where active;

-- ---------- inspections (one six-month walk) --------------------------------

create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_number int not null,
  is_baseline boolean not null default false,
  status text not null default 'in_progress' check (status in (
    'in_progress','scoring','drafted','sent'
  )),
  -- Raw instrument answers: { [question_key]: value }.
  raw_answers jsonb,
  -- Per-layer reads with confidence: { foundation: {...}, frame: {...}, ... }.
  layer_reads jsonb,
  -- Per-dimension gap + direction (narrowing/steady/widening).
  trajectory_read jsonb,
  -- The governed report prose (must pass lib/inspection/governance.ts).
  generated_report text,
  -- Governance router outcome (GOVERNANCE Part 6).
  flag_status text not null default 'none' check (flag_status in ('none','routed','cleared')),
  flag_reasons text[] not null default '{}',
  -- Cayden's review, when routed.
  reviewed_by uuid references profiles(id) on delete set null,
  cayden_note text,
  started_at timestamptz default now(),
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, cycle_number)
);

create index if not exists idx_inspections_user_cycle
  on inspections (user_id, cycle_number desc);

create trigger inspections_updated_at_trg
  before update on inspections
  for each row execute function public.set_current_updated_at();

-- ---------- review_queue_items (Cayden's queue) -----------------------------

create table if not exists review_queue_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  flag_reasons text[] not null default '{}',
  status text not null default 'pending' check (status in (
    'pending','approved','edited','noted','resolved'
  )),
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique (inspection_id)
);

create index if not exists idx_review_queue_status
  on review_queue_items (status);

-- ====================== Row-level security =================================
-- Pattern mirrors 0001_init.sql: users reach only their own rows.

alter table growth_plans enable row level security;
alter table principle_selections enable row level security;
alter table principle_mappings enable row level security;
alter table growth_goals enable row level security;
alter table cascade_checkins enable row level security;
alter table cascade_checkin_goals enable row level security;
alter table inspections enable row level security;
alter table inspection_questions enable row level security;
alter table review_queue_items enable row level security;

drop policy if exists "users access own growth_plans" on growth_plans;
create policy "users access own growth_plans" on growth_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own principle_selections" on principle_selections;
create policy "users access own principle_selections" on principle_selections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own principle_mappings" on principle_mappings;
create policy "users access own principle_mappings" on principle_mappings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own growth_goals" on growth_goals;
create policy "users access own growth_goals" on growth_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own cascade_checkins" on cascade_checkins;
create policy "users access own cascade_checkins" on cascade_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users access own cascade_checkin_goals" on cascade_checkin_goals;
create policy "users access own cascade_checkin_goals" on cascade_checkin_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inspections: users may READ only their own SENT reports. Drafts, routed
-- reports, and hard notes must never reach a user before review (GOVERNANCE
-- Part 6). All writes (answer capture, scoring, report generation, routing)
-- go through server routes using the service-role client, which bypasses RLS.
drop policy if exists "users read own sent inspections" on inspections;
create policy "users read own sent inspections" on inspections
  for select using (auth.uid() = user_id and sent_at is not null);

-- Question bank: any authenticated user may read active questions. Writes are
-- service-role only (no client policy granted).
drop policy if exists "authenticated read question bank" on inspection_questions;
create policy "authenticated read question bank" on inspection_questions
  for select using (auth.role() = 'authenticated' and active);

-- review_queue_items: no client policies. RLS is enabled with no policy, so
-- only the service-role client (Cayden's admin surface) can reach these rows.
