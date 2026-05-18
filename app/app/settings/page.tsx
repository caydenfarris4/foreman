import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { accessFor } from "@/lib/billing";
import { PRICING } from "@/lib/stripe";
import type { Profile } from "@/lib/database.types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = data as Profile | null;
  if (!profile) return null;

  const access = accessFor(profile);
  const planLabel =
    profile.stripe_price_id === process.env.STRIPE_PRICE_YEARLY
      ? `Yearly · ${PRICING.yearly.display}${PRICING.yearly.suffix}`
      : profile.stripe_price_id === process.env.STRIPE_PRICE_MONTHLY
        ? `Monthly · ${PRICING.monthly.display}${PRICING.monthly.suffix}`
        : "—";

  return (
    <div className="space-y-6 px-3 pb-8 pt-4">
      <div className="px-1">
        <p className="type-cap text-graphite">YOUR SITE</p>
        <h1 className="type-h1 mt-2 text-ink">Settings</h1>
        <p className="type-body mt-2 text-graphite">
          Editable fields are coming next. For now, what&apos;s on file.
        </p>
      </div>

      {/* Billing */}
      <div className="rounded-lg border border-rule bg-chalk p-5">
        <div className="flex items-baseline justify-between">
          <p className="type-cap text-graphite">BILLING</p>
          <span className="type-cap text-ink2">
            {profile.subscription_status.toUpperCase()}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-1 divide-y divide-rule">
          <Row label="Plan" value={planLabel} />
          {access.state === "trialing" ? (
            <Row
              label="Trial ends"
              value={`${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left · ${new Date(
                access.trialEndsAt,
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}`}
            />
          ) : null}
          {access.state === "trial_expired" ? (
            <Row
              label="Trial ended"
              value={new Date(access.trialEndsAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          ) : null}
          {profile.subscription_current_period_end ? (
            <Row
              label="Next charge"
              value={new Date(
                profile.subscription_current_period_end,
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          ) : null}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.stripe_customer_id ? (
            <form action="/api/stripe/portal" method="post">
              <Button type="submit" variant="secondary" size="md">
                Open billing portal
              </Button>
            </form>
          ) : null}
          {profile.subscription_status !== "active" ? (
            <Button asChild size="md">
              <a href="/app/upgrade">Pick a plan</a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Profile */}
      <div className="rounded-lg border border-rule bg-chalk p-5">
        <p className="type-cap text-graphite">PROFILE · {user.email}</p>
        <dl className="mt-4 grid grid-cols-1 divide-y divide-rule">
          <Row label="Name" value={profile.name} />
          <Row label="Role" value={profile.role_title} />
          <Row label="Team size" value={profile.team_size?.toString()} />
          <Row label="Started managing" value={profile.promoted_at} />
          <Row label="Current focus" value={profile.current_challenge} />
          <Row label="Current phase" value={profile.current_phase} />
          <Row label="Sabbath day" value={profile.sabbath_day} />
          <Row label="Retro day" value={profile.retro_day} />
          <Row
            label="Daily prompt time"
            value={profile.notification_time?.slice(0, 5)}
          />
          <Row label="Timezone" value={profile.timezone} />
        </dl>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="type-cap text-graphite">{label}</dt>
      <dd className="type-body text-ink">{value || "—"}</dd>
    </div>
  );
}
