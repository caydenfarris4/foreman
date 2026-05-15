import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessFor } from "@/lib/billing";
import { PRICING } from "@/lib/stripe";
import type { Profile } from "@/lib/database.types";
import { UpgradeButtons } from "./upgrade-buttons";

type SearchParams = { checkout?: string };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) redirect("/onboarding");

  const access = accessFor(profile);
  const cancelled = params.checkout === "cancelled";

  // If the user is already active, no need to be here — bounce them home.
  if (access.state === "active") redirect("/app");

  const eyebrow =
    access.state === "trialing"
      ? `${access.daysLeft} DAY${access.daysLeft === 1 ? "" : "S"} LEFT IN TRIAL`
      : access.state === "trial_expired"
        ? "YOUR TRIAL HAS ENDED"
        : access.state === "past_due"
          ? "PAYMENT NEEDS ATTENTION"
          : "RE-OPEN THE SITE";

  const headline =
    access.state === "trialing"
      ? "Keep building."
      : access.state === "past_due"
        ? "Your last payment didn't clear."
        : access.state === "churned"
          ? "Welcome back."
          : "Trial's done. Time to commit.";

  const sub =
    access.state === "trialing"
      ? "Lock in your plan before the trial ends so you don't lose the streak."
      : access.state === "past_due"
        ? "Update the card in your portal and we'll re-open the site."
        : "Single product, two prices. Pick the one that fits your year.";

  return (
    <div className="px-3 pb-8 pt-4">
      <div className="px-1">
        <div className="mb-2 h-[2px] w-7 bg-oak" />
        <p className="type-cap text-oak-dim">{eyebrow}</p>
        <h1 className="type-h1 mt-2 text-ink">{headline}</h1>
        <p className="type-body mt-2 text-graphite">{sub}</p>
      </div>

      {cancelled ? (
        <div className="mt-5 rounded-md border border-rule bg-paper2 p-4">
          <p className="type-caption text-ink2">
            Checkout cancelled. Nothing was charged. Pick a plan when
            you&apos;re ready.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PlanCard
          eyebrow="MONTHLY"
          price={PRICING.monthly.display}
          suffix={PRICING.monthly.suffix}
          body="Pay as you go. Cancel any time from your billing portal."
        />
        <PlanCard
          eyebrow="YEARLY"
          price={PRICING.yearly.display}
          suffix={PRICING.yearly.suffix}
          body="Two months free. The price of finishing what you started."
          savings={PRICING.yearly.savings}
          highlighted
        />
      </div>

      <div className="mt-5">
        <UpgradeButtons />
      </div>

      <div className="mt-8 space-y-3 rounded-md border border-rule bg-chalk p-5">
        <p className="type-cap text-graphite">WHAT YOU&apos;RE PAYING FOR</p>
        <ul className="space-y-2">
          {[
            "A daily prompt grounded in the Under Construction framework",
            "Real coaching back, under 250 words, in the foreman's voice",
            "A searchable library of every situation you've worked through",
            "A weekly site report that names the pattern across the week",
            "A sabbath day that pauses the whole thing. No streaks, no shame.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <CheckIcon />
              <span className="type-body text-ink2">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {profile.stripe_customer_id ? (
        <p className="type-caption mt-6 text-center text-graphite">
          Trouble with a previous payment?{" "}
          <ManagePortalLink />
        </p>
      ) : null}
    </div>
  );
}

function PlanCard({
  eyebrow,
  price,
  suffix,
  body,
  savings,
  highlighted,
}: {
  eyebrow: string;
  price: string;
  suffix: string;
  body: string;
  savings?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-lg border-[1.5px] border-oak bg-oak-wash p-5"
          : "rounded-lg border border-rule bg-chalk p-5"
      }
    >
      <div className="flex items-baseline justify-between">
        <p className="type-cap text-graphite">{eyebrow}</p>
        {savings ? (
          <span className="type-cap text-oak-dim">{savings}</span>
        ) : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="type-h1 text-ink">{price}</span>
        <span className="type-body text-graphite">{suffix}</span>
      </p>
      <p className="type-body-sm mt-2 text-ink2">{body}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-oak-dim"
    >
      <path d="M4 10l4 4 8-8" />
    </svg>
  );
}

function ManagePortalLink() {
  return (
    <form
      action="/api/stripe/portal"
      method="post"
      className="inline"
    >
      <button
        type="submit"
        className="underline underline-offset-2 hover:text-ink"
      >
        Open your billing portal
      </button>
    </form>
  );
}
