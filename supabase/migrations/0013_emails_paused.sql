-- Foreman: user-controlled pause for the recurring coaching emails
-- (daily prompt, sabbath reflection, weekly retro, inspection-due notice).
-- Transactional email (receipts, purchase confirmations, password resets)
-- is unaffected. Toggled in Settings or via the tokenized unsubscribe link
-- in every recurring email (/api/email/unsubscribe).

alter table profiles
  add column if not exists emails_paused boolean not null default false;
