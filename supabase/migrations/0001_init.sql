-- Foreman: initial schema
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- Profile data, 1:1 with auth.users
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  role_title text,
  promoted_at date,
  team_size int,
  team_context text,
  industry text,
  current_challenge text,
  current_phase text default 'framing' check (current_phase in ('foundation','framing','finishing')),
  sabbath_day text default 'sunday' check (sabbath_day in
    ('sunday','monday','tuesday','wednesday','thursday','friday','saturday','none')),
  notification_time time default '07:00',
  timezone text default 'America/Denver',
  onboarded_at timestamptz,
  subscription_status text default 'trial' check (subscription_status in
    ('trial','active','past_due','churned')),
  stripe_customer_id text,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now()
);

create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  checkin_date date not null,
  prompt_text text not null,
  user_response text,
  ai_coaching text,
  framework_phase text check (framework_phase in ('foundation','framing','finishing')),
  tags text[] default '{}',
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, checkin_date)
);

create table if not exists weekly_retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  week_start date not null,
  wins text,
  struggles text,
  lessons text,
  ai_synthesis text,
  framework_focus text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create table if not exists situations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  situation text not null,
  coaching text not null,
  framework_phase text,
  tags text[] default '{}',
  source_checkin_id uuid references daily_checkins(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_checkins_user_date on daily_checkins (user_id, checkin_date desc);
create index if not exists idx_situations_user_created on situations (user_id, created_at desc);
create index if not exists idx_situations_tags on situations using gin (tags);
create index if not exists idx_retros_user_week on weekly_retros (user_id, week_start desc);

-- Row-level security: users only access their own data
alter table profiles enable row level security;
alter table daily_checkins enable row level security;
alter table weekly_retros enable row level security;
alter table situations enable row level security;

drop policy if exists "users access own profile" on profiles;
drop policy if exists "users access own checkins" on daily_checkins;
drop policy if exists "users access own retros" on weekly_retros;
drop policy if exists "users access own situations" on situations;

create policy "users access own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users access own checkins" on daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users access own retros" on weekly_retros
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users access own situations" on situations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
