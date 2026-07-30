-- Foreman: track which waitlist signups have received the one-time launch
-- announcement (scripts/send-launch-email.mjs). Lets the send script be
-- re-run safely — already-notified rows are skipped.

alter table waitlist_signups
  add column if not exists launch_notified_at timestamptz;
