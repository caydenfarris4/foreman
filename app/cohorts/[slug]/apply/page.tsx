import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { createClient } from "@/lib/supabase/server";
import type { Cohort, CohortParticipant } from "@/lib/database.types";
import {
  formatCohortDateRange,
  formatCohortPrice,
  isValidSlug,
  priceForUser,
} from "@/lib/cohorts";
import { ApplyForm } from "./apply-form";
import { CheckoutButton } from "./checkout-button";

export default async function CohortApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const checkoutCancelled = sp.checkout === "cancelled";
  if (!isValidSlug(slug)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/cohorts/${slug}/apply`)}`);
  }

  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("*")
    .eq("slug", slug)
    .in("status", ["open"])
    .maybeSingle();
  const cohort = cohortRow as Cohort | null;
  if (!cohort) {
    // Either doesn't exist, or not open. Send to the detail page —
    // it'll show the closed/full state.
    redirect(`/cohorts/${slug}`);
  }

  const { data: pRow } = await supabase
    .from("profiles")
    .select("name, email, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  const profile = pRow as {
    name: string | null;
    email: string;
    subscription_status: "trial" | "active" | "past_due" | "churned";
  } | null;

  // Already applied?
  const { data: existingRow } = await supabase
    .from("cohort_participants")
    .select("id, status")
    .eq("cohort_id", cohort.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const existing = existingRow as Pick<
    CohortParticipant,
    "id" | "status"
  > | null;

  const price = priceForUser(cohort, profile);

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-rule">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Foreman home">
            <Wordmark />
          </Link>
          <Link
            href={`/cohorts/${cohort.slug}`}
            className="type-label text-graphite hover:text-ink"
          >
            ← Back to cohort
          </Link>
        </div>
      </header>

      <section className="container max-w-2xl pb-16 pt-12">
        <p className="type-cap text-graphite">
          APPLYING · {formatCohortDateRange(cohort.start_date, cohort.end_date)}
        </p>
        <h1 className="type-h1 mt-3 text-ink md:text-[32px]">
          {cohort.name}
        </h1>
        <p className="type-body mt-3 text-graphite">
          Cayden reviews every application personally. Expect a response
          within 5 business days. If accepted, you&apos;ll have 7 days
          to complete payment ({formatCohortPrice(price.cents)}
          {price.isDiscounted ? " — subscriber price" : ""}).
        </p>

        {checkoutCancelled ? (
          <div className="mt-6 rounded-md border border-rule bg-paper2/40 p-4">
            <p className="type-cap text-graphite">CHECKOUT CANCELLED</p>
            <p className="type-body-sm mt-1 text-ink2">
              No charge — nothing happened. Your accepted application is
              still good for the rest of your 7-day window. Hit
              &ldquo;Pay &amp; enroll&rdquo; below whenever you&apos;re
              ready.
            </p>
          </div>
        ) : null}

        {existing ? (
          <ExistingState
            status={existing.status}
            cohortId={cohort.id}
            cohortSlug={cohort.slug}
          />
        ) : (
          <ApplyForm
            cohortId={cohort.id}
            cohortSlug={cohort.slug}
            initialName={profile?.name ?? ""}
          />
        )}
      </section>
    </main>
  );
}

function ExistingState({
  status,
  cohortId,
  cohortSlug,
}: {
  status: string;
  cohortId: string;
  cohortSlug: string;
}) {
  const labels: Record<string, { headline: string; body: string }> = {
    applied: {
      headline: "Application under review.",
      body: "We've got your application. Cayden reviews every one personally and replies within 5 business days. Check your email.",
    },
    accepted: {
      headline: "You're in — payment is the next step.",
      body: "Use the button below to complete checkout (7-day window from acceptance).",
    },
    paid: {
      headline: "Payment confirmed. Welcome.",
      body: "You'll see the cohort dashboard in your app once the session schedule is published.",
    },
    enrolled: {
      headline: "You're enrolled.",
      body: "Head to your cohort dashboard for the schedule and prep materials.",
    },
    rejected: {
      headline: "Not this cohort.",
      body: "We can't take everyone every quarter. Watch for the next cohort opening.",
    },
    withdrew: {
      headline: "You withdrew from this cohort.",
      body: "If that was an accident, email Cayden directly.",
    },
    completed: {
      headline: "You completed this cohort.",
      body: "Welcome to the alumni — see the dashboard for what's next.",
    },
  };
  const { headline, body } = labels[status] ?? {
    headline: "We have your application on file.",
    body: "",
  };
  return (
    <div className="mt-8 rounded-lg border border-rule bg-chalk p-6">
      <p className="type-h2 text-ink">{headline}</p>
      {body ? <p className="type-body mt-2 text-ink2">{body}</p> : null}
      {status === "accepted" ? (
        <div className="mt-4">
          <CheckoutButton cohortSlug={cohortSlug} />
        </div>
      ) : null}
      <p className="type-caption mt-4 text-graphite">
        <Link href={`/cohorts/${cohortSlug}`} className="underline">
          Back to cohort page
        </Link>
      </p>
    </div>
  );
}
