-- Foreman: app-launch waitlist (the book's QR code → foreman.coach/start).
-- Run via Supabase SQL editor or `supabase db push`.
--
-- Emails are normalized to lowercase in the API route before insert, so the
-- plain unique constraint on email is effectively case-insensitive. `source`
-- distinguishes where a signup came from ('book_qr' = scanned from the book).

create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'book_qr',
  created_at timestamptz default now()
);

create index if not exists idx_waitlist_signups_created
  on waitlist_signups (created_at desc);

-- RLS on, no policies: only the service-role client (the API route) can
-- read or write. Launch leads are never exposed to browsers or anon keys.
alter table waitlist_signups enable row level security;
