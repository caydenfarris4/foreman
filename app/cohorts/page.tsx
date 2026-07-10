import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Cohort } from "@/lib/database.types";
import {
  formatCohortDateRange,
  formatCohortPrice,
} from "@/lib/cohorts";

export const metadata: Metadata = {
  title: "Foreman Cohort — 8-week group coaching for first-time managers",
  description:
    "A closed-group program for first-time managers. Twelve participants. Eight weekly Saturday-morning sessions. Real coaching, not corporate fluff.",
};

export default async function CohortsLandingPage() {
  const supabase = await createClient();
  // Public read — RLS allows status in ('open','full','in_progress','completed').
  // We surface the actively-sellable ones first.
  const { data: openRows } = await supabase
    .from("cohorts")
    .select(
      "id, name, slug, description, start_date, end_date, capacity, price_cents, subscriber_discount_cents, status, hero_quote",
    )
    .in("status", ["open", "full"])
    .order("start_date", { ascending: true });
  const open = (openRows ?? []) as Pick<
    Cohort,
    | "id"
    | "name"
    | "slug"
    | "description"
    | "start_date"
    | "end_date"
    | "capacity"
    | "price_cents"
    | "subscriber_discount_cents"
    | "status"
    | "hero_quote"
  >[];

  return (
    <main className="min-h-screen bg-paper">
      <PublicHeader />

      <section className="container max-w-3xl pb-12 pt-20">
        <p className="type-cap text-graphite">FOREMAN · COHORT 8</p>
        <h1 className="type-display mt-4 text-ink md:text-[44px] md:leading-[1.1]">
          Eight weeks. Twelve managers. One framework.
        </h1>
        <p className="type-body-lg mt-6 max-w-2xl text-ink2">
          A closed-group program for first-time managers. Saturday mornings,
          ninety minutes, eight weeks. Built on the Under Construction
          framework: foundation, framing, finishing. No corporate
          curriculum, no PowerPoints — coaching, peer work, and one
          guest mentor each phase.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {open.length > 0 ? (
            <Button asChild size="lg">
              <Link href={`/cohorts/${open[0].slug}`}>
                See the upcoming cohort
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="secondary" disabled>
              <span>No cohort open right now</span>
            </Button>
          )}
          <Button asChild size="lg" variant="ghost">
            <Link href="#how">How it works</Link>
          </Button>
        </div>
        <p className="type-caption mt-4 text-graphite">
          Twelve seats per cohort. Application required. Foreman app
          subscribers get $150 off.
        </p>
      </section>

      <section id="how" className="border-y border-rule bg-paper2">
        <div className="container max-w-3xl py-20">
          <p className="type-cap text-graphite">HOW IT WORKS</p>
          <h2 className="type-h1 mt-3 text-ink md:text-[36px]">
            Eight weeks, built like a building.
          </h2>
          <p className="type-body-lg mt-4 text-ink2">
            Three phases, eight sessions. Same group every week. Cayden
            facilitates every session personally. A guest mentor joins for
            phases 2 and 3 — and offers 30-minute office hours slots in
            between.
          </p>
          <ol className="mt-10 space-y-5">
            {PHASES.map((p, i) => (
              <li
                key={p.title}
                className="grid gap-3 md:grid-cols-[140px_1fr]"
              >
                <div>
                  <p className="type-cap text-graphite">
                    PHASE {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="type-cap mt-1 text-oak-dim">{p.eyebrow}</p>
                </div>
                <div>
                  <p className="type-h2 text-ink">{p.title}</p>
                  <p className="type-body mt-2 text-ink2">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container max-w-3xl py-20">
        <p className="type-cap text-graphite">UPCOMING COHORTS</p>
        <h2 className="type-h1 mt-3 text-ink md:text-[36px]">
          Pick the start date that works.
        </h2>
        {open.length === 0 ? (
          <div className="mt-8 rounded-lg border border-rule bg-chalk p-6">
            <p className="type-h2 text-ink">
              No cohort open right now.
            </p>
            <p className="type-body mt-2 text-graphite">
              The next quarter&apos;s cohort opens soon. Drop your email
              and you&apos;ll get first dibs on applications.
            </p>
            <p className="type-caption mt-3 text-graphite">
              Waitlist sign-up arrives in the next release.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {open.map((c) => (
              <CohortCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <PublicFooter />
    </main>
  );
}

function CohortCard({
  c,
}: {
  c: Pick<
    Cohort,
    | "name"
    | "slug"
    | "description"
    | "start_date"
    | "end_date"
    | "capacity"
    | "price_cents"
    | "subscriber_discount_cents"
    | "status"
    | "hero_quote"
  >;
}) {
  const isFull = c.status === "full";
  const discounted =
    c.subscriber_discount_cents && c.subscriber_discount_cents > 0
      ? formatCohortPrice(c.price_cents - c.subscriber_discount_cents)
      : null;
  return (
    <Link
      href={`/cohorts/${c.slug}`}
      className="block rounded-lg border border-rule bg-chalk p-6 transition-colors hover:bg-paper2/40"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="type-cap text-graphite">
            {formatCohortDateRange(c.start_date, c.end_date)}
          </p>
          <p className="type-h2 mt-1 text-ink">{c.name}</p>
        </div>
        <div className="text-right">
          {isFull ? (
            <Badge variant="neutral" size="sm">
              Waitlist only
            </Badge>
          ) : (
            <>
              <p className="type-h2 text-ink">
                {formatCohortPrice(c.price_cents)}
              </p>
              {discounted ? (
                <p className="type-caption text-oak-dim">
                  Subscribers: {discounted}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      {c.hero_quote ? (
        <p className="type-prompt mt-4 text-[18px] text-ink2">
          &ldquo;{c.hero_quote}&rdquo;
        </p>
      ) : c.description ? (
        <p className="type-body mt-3 text-ink2">{c.description}</p>
      ) : null}
      <p className="type-caption mt-4 text-graphite">
        Saturdays 10:00 AM Mountain Time · 8 weeks ·{" "}
        {c.capacity} seats · {isFull ? "FULL" : "Apply →"}
      </p>
    </Link>
  );
}

function PublicHeader() {
  return (
    <header className="border-b border-rule">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Foreman home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/#pricing"
            className="type-label hidden text-graphite hover:text-ink md:inline"
          >
            App pricing
          </Link>
          <Link
            href="/login"
            className="type-label text-graphite hover:text-ink"
          >
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-rule bg-paper2">
      <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
        <Wordmark />
        <span className="type-caption text-graphite">
          Built from the job site, not the penthouse.
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="type-label text-graphite hover:text-ink"
          >
            The app
          </Link>
          <Link
            href="/cohorts"
            className="type-label text-graphite hover:text-ink"
          >
            Cohorts
          </Link>
        </div>
      </div>
    </footer>
  );
}

const PHASES = [
  {
    eyebrow: "FOUNDATION",
    title: "Who you are when no one's watching",
    body: "Self-leadership, principles, character. Sessions 1–2.",
  },
  {
    eyebrow: "FRAMING",
    title: "Building the team and the structure",
    body: "Expectations, 1:1s, feedback, accountability. Sessions 3–5 — guest mentor joins session 3.",
  },
  {
    eyebrow: "FINISHING",
    title: "Refinement, culture, legacy",
    body: "The mark you leave on the people who'll be here after you. Sessions 6–8 — guest mentor joins session 6.",
  },
];
