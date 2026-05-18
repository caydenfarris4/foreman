-- Foreman: Cohort program schema.
-- Adds 8 tables + RLS policies + an admin flag on profiles +
-- a stripe webhook idempotency table.

-- ---------- profiles: admin flag ----------------------------------------

alter table profiles
  add column if not exists is_admin boolean not null default false;

-- ---------- mentors -----------------------------------------------------

create table if not exists mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  company text,
  bio text,
  photo_url text,
  email text,
  linkedin_url text,
  expertise_areas text[] default '{}',
  rate_per_session_cents int default 75000,
  values_aligned boolean default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_mentors_active on mentors (active);

-- ---------- cohorts -----------------------------------------------------

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  start_date date not null,
  end_date date not null,
  capacity int not null default 12,
  price_cents int not null default 80000,
  subscriber_discount_cents int default 15000,
  status text not null default 'draft' check (status in
    ('draft','open','full','in_progress','completed','archived')),
  stripe_product_id text,
  stripe_price_id_standard text,
  stripe_price_id_subscriber text,
  hero_quote text,
  curriculum_summary text,
  created_at timestamptz default now()
);

create index if not exists idx_cohorts_status on cohorts (status);
create index if not exists idx_cohorts_start_date on cohorts (start_date);

-- ---------- cohort_sessions --------------------------------------------

create table if not exists cohort_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  session_number int not null check (session_number between 1 and 8),
  title text not null,
  framework_phase text check (framework_phase in
    ('foundation','framing','finishing')),
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int default 90,
  meeting_url text,
  guest_mentor_id uuid references mentors(id) on delete set null,
  prep_materials text,
  recording_url text,
  facilitator_notes text,
  created_at timestamptz default now(),
  unique (cohort_id, session_number)
);

create index if not exists idx_sessions_cohort on cohort_sessions (cohort_id, session_number);

-- ---------- cohort_participants ----------------------------------------

create table if not exists cohort_participants (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  application_text text not null,
  why_joining text,
  current_team_size int,
  current_challenge text,
  agreed_to_commitment boolean not null default false,
  status text not null default 'applied' check (status in
    ('applied','accepted','rejected','paid','enrolled','completed','withdrew')),
  stripe_payment_intent_id text,
  amount_paid_cents int,
  applied_at timestamptz default now(),
  accepted_at timestamptz,
  enrolled_at timestamptz,
  completed_at timestamptz,
  withdrew_at timestamptz,
  testimonial text,
  testimonial_approved boolean default false,
  free_app_access_until timestamptz,
  unique (cohort_id, user_id)
);

create index if not exists idx_participants_cohort on cohort_participants (cohort_id, status);
create index if not exists idx_participants_user on cohort_participants (user_id);

-- ---------- session_attendance -----------------------------------------

create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references cohort_sessions(id) on delete cascade,
  participant_id uuid not null references cohort_participants(id) on delete cascade,
  attended boolean not null default false,
  joined_at timestamptz,
  left_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  unique (session_id, participant_id)
);

create index if not exists idx_attendance_session on session_attendance (session_id);

-- ---------- office_hours_bookings --------------------------------------

create table if not exists office_hours_bookings (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  participant_id uuid not null references cohort_participants(id) on delete cascade,
  mentor_id uuid not null references mentors(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes int default 30,
  meeting_url text,
  status text not null default 'scheduled' check (status in
    ('scheduled','completed','no_show','rescheduled','cancelled')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_office_hours_cohort on office_hours_bookings (cohort_id, scheduled_at);
create index if not exists idx_office_hours_participant on office_hours_bookings (participant_id);

-- ---------- cohort_waitlist --------------------------------------------

create table if not exists cohort_waitlist (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  email text not null,
  name text,
  notified boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz default now(),
  unique (cohort_id, email)
);

create index if not exists idx_waitlist_cohort on cohort_waitlist (cohort_id);

-- ---------- stripe_webhook_events (idempotency ledger) -----------------

create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- ---------- Row-level security ----------------------------------------

alter table cohorts enable row level security;
alter table mentors enable row level security;
alter table cohort_sessions enable row level security;
alter table cohort_participants enable row level security;
alter table session_attendance enable row level security;
alter table office_hours_bookings enable row level security;
alter table cohort_waitlist enable row level security;
alter table stripe_webhook_events enable row level security;

-- Public reads on cohorts that are publicly visible
drop policy if exists "public reads visible cohorts" on cohorts;
create policy "public reads visible cohorts" on cohorts
  for select using (status in ('open','full','in_progress','completed'));

-- Public reads on active mentors (bios on cohort pages)
drop policy if exists "public reads active mentors" on mentors;
create policy "public reads active mentors" on mentors
  for select using (active = true);

-- Participants see their own enrollment
drop policy if exists "participants see own enrollment" on cohort_participants;
create policy "participants see own enrollment" on cohort_participants
  for select using (auth.uid() = user_id);

-- Participants see sessions of their enrolled cohort
drop policy if exists "participants see own cohort sessions" on cohort_sessions;
create policy "participants see own cohort sessions" on cohort_sessions
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.cohort_id = cohort_sessions.cohort_id
      and cp.user_id = auth.uid()
      and cp.status in ('paid','enrolled','completed')
    )
  );

-- Participants see their own attendance
drop policy if exists "participants see own attendance" on session_attendance;
create policy "participants see own attendance" on session_attendance
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.id = session_attendance.participant_id
      and cp.user_id = auth.uid()
    )
  );

-- Participants see their own office hours
drop policy if exists "participants see own office hours" on office_hours_bookings;
create policy "participants see own office hours" on office_hours_bookings
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.id = office_hours_bookings.participant_id
      and cp.user_id = auth.uid()
    )
  );

-- Waitlist, stripe_webhook_events, and write paths on the cohort tables
-- are all server-only via the service-role admin client. No public
-- INSERT/UPDATE/DELETE policies — RLS blocks everything except the
-- SELECTs above. Admin operations bypass RLS via the admin client.
