-- Foreman: stripe-driven subscription columns.
-- Keeps the source of truth in Stripe; we mirror the bare minimum.

alter table profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_current_period_end timestamptz;

create index if not exists idx_profiles_stripe_customer
  on profiles (stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription
  on profiles (stripe_subscription_id);
