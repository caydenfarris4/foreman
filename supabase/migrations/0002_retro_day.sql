-- Foreman: explicit retro day per user (replaces the
-- sabbath-derived rhythm). Defaults to Sunday.

alter table profiles
  add column if not exists retro_day text default 'sunday'
  check (retro_day in ('sunday','monday','tuesday','wednesday','thursday','friday','saturday'));
