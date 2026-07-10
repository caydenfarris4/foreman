-- Foreman: journal entry kinds + sources.
-- "Knowledge carefully recorded is knowledge available in a time of need."
--
-- The journal grows from reflections into the user's recorded knowledge:
--   reflection — free writing (the original kind)
--   quote      — something worth keeping from a book/talk they're reading,
--                with `source` attribution ("Under Construction — C. Farris")
--   insight    — a key point saved from a coaching response
-- The coaching engine reads these back as context, so what the user records
-- is available to the coach in a time of need.

alter table journal_entries
  add column if not exists kind text not null default 'reflection'
    check (kind in ('reflection', 'quote', 'insight')),
  add column if not exists source text;
