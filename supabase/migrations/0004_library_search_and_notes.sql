-- Foreman: Phase 3 library upgrades.
-- 1. Full-text search column on situations (tsvector + GIN index).
-- 2. situation_notes child table for follow-up annotations.

-- ---------- 1. Full-text search on situations ---------------------------

alter table situations
  add column if not exists search_vector tsvector;

-- Generated from title + situation + coaching. English stemmer / stopword
-- list — works fine for the conversational coaching corpus.
create or replace function situations_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.situation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.coaching, '')), 'C');
  return new;
end;
$$;

drop trigger if exists situations_search_vector_trg on situations;
create trigger situations_search_vector_trg
  before insert or update of title, situation, coaching
  on situations
  for each row
  execute function situations_search_vector_update();

-- Backfill any existing rows.
update situations set
  search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(situation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(coaching, '')), 'C')
where search_vector is null;

create index if not exists idx_situations_search_vector
  on situations using gin (search_vector);

-- ---------- 2. situation_notes child table -----------------------------

create table if not exists situation_notes (
  id uuid primary key default gen_random_uuid(),
  situation_id uuid not null references situations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz default now()
);

create index if not exists idx_situation_notes_situation
  on situation_notes (situation_id, created_at desc);

alter table situation_notes enable row level security;

drop policy if exists "users access own situation notes" on situation_notes;
create policy "users access own situation notes" on situation_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
