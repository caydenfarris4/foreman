-- Foreman: Phase 4 retro upgrades.
-- 1. weekly_retros gets a `skipped` flag and an `updated_at` timestamp.
-- 2. monthly_syntheses table for the 4+-retro pattern synthesis.

alter table weekly_retros
  add column if not exists skipped boolean not null default false,
  add column if not exists updated_at timestamptz default now();

create or replace function weekly_retros_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists weekly_retros_updated_at_trg on weekly_retros;
create trigger weekly_retros_updated_at_trg
  before update on weekly_retros
  for each row
  execute function weekly_retros_set_updated_at();

-- ---------- monthly_syntheses -----------------------------------------

create table if not exists monthly_syntheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  month_start date not null,
  ai_summary text not null,
  framework_focus text check (framework_focus in ('foundation','framing','finishing')),
  retro_count int not null,
  created_at timestamptz default now(),
  unique (user_id, month_start)
);

create index if not exists idx_monthly_syntheses_user_month
  on monthly_syntheses (user_id, month_start desc);

alter table monthly_syntheses enable row level security;

drop policy if exists "users access own monthly syntheses" on monthly_syntheses;
create policy "users access own monthly syntheses" on monthly_syntheses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
