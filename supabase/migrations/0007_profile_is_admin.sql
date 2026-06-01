-- Foreman: admin flag on profiles.
--
-- Needed for the Growth Inspection review queue (Cayden's surface) and any
-- other admin-only capability. Additive and INERT for now: no RLS policy reads
-- it yet, so existing access is unchanged. Stage 7 (governance router + review
-- queue) will add the policies that consult this column.
--
-- See docs/growth-inspection/OVERLAPS.md (Overlap 7) for the admin-auth decision.

alter table profiles
  add column if not exists is_admin boolean not null default false;
