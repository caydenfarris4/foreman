import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import type {
  Cohort,
  CohortSession,
  Mentor,
  Profile,
} from "@/lib/database.types";
import {
  formatCohortDateRange,
  formatCohortPrice,
  isValidSlug,
  priceForUser,
} from "@/lib/cohorts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Cohort — Foreman" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("cohorts")
    .select("name, description, hero_quote")
    .eq("slug", slug)
    .in("status", ["open", "full", "in_progress", "completed"])
    .maybeSingle();
  const c = data as Pick<Cohort, "name" | "description" | "hero_quote"> | null;
  if (!c) return { title: "Cohort — Foreman" };
  return {
    title: `${c.name} — Foreman Cohort`,
    description:
      c.hero_quote ??
      c.description ??
      "An 8-week group coaching program for first-time managers.",
  };
}

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const supabase = await createClient();
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("*")
    .eq("slug", slug)
    .in("status", ["open", "full", "in_progress", "completed"])
    .maybeSingle();
  const cohort = cohortRow as Cohort | null;
  if (!cohort) notFound();

  // Curriculum.
  const { data: sessionRows } = await supabase
    .from("cohort_sessions")
    .select("session_number, title, framework_phase, scheduled_at, guest_mentor_id")
    .eq("cohort_id", cohort.id)
    .order("session_number", { ascending: true });
  const sessions = (sessionRows ?? []) as Pick<
    CohortSession,
    "session_number" | "title" | "framework_phase" | "scheduled_at" | "guest_mentor_id"
  >[];

  // Guest mentors. Public read policy allows active = true mentors only.
  const mentorIds = sessions
    .map((s) => s.guest_mentor_id)
    .filter((id): id is string => !!id);
  const { data: mentorRows } =
    mentorIds.length > 0
      ? await supabase
          .from("mentors")
          .select("id, name, title, company, bio, photo_url, linkedin_url")
          .in("id", mentorIds)
      : { data: [] };
  const mentors = (mentorRows ?? []) as Pick<
    Mentor,
    "id" | "name" | "title" | "company" | "bio" | "photo_url" | "linkedin_url"
  >[];
  const mentorById = new Map(mentors.map((m) => [m.id, m] as const));

  // Subscriber discount preview: check the viewer's profile if signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let viewerProfile: Pick<Profile, "subscription_status"> | null = null;
  if (user) {
    const { data: pRow } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    viewerProfile = pRow as Pick<Profile, "subscription_status"> | null;
  }
  const price = priceForUser(cohort, viewerProfile);

  const isOpen = cohort.status === "open";
  const isFull = cohort.status === "full";

  return (
    <main className="min-h-screen bg-paper">
      <PublicHeader />

      <section className="container max-w-3xl pb-12 pt-16">
        <p className="type-cap text-graphite">
          {formatCohortDateRange(cohort.start_date, cohort.end_date)} ·{" "}
          Saturdays 10:00 AM MT
        </p>
        <h1 className="type-display mt-4 text-ink md:text-[44px] md:leading-[1.1]">
          {cohort.name}
        </h1>
        {cohort.hero_quote ? (
          <p className="type-prompt mt-6 text-[22px] text-ink2">
            &ldquo;{cohort.hero_quote}&rdquo;
          </p>
        ) : null}
        {cohort.description ? (
          <p className="type-body-lg mt-6 max-w-2xl text-ink2">
            {cohort.description}
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="type-h1 text-ink">
              {formatCohortPrice(price.cents)}
              {price.isDiscounted ? (
                <span className="type-body ml-2 text-graphite line-through">
                  {formatCohortPrice(cohort.price_cents)}
                </span>
              ) : null}
            </p>
            {price.isDiscounted ? (
              <p className="type-caption mt-1 text-oak-dim">
                Subscriber price applied automatically at checkout.
              </p>
            ) : (
              <p className="type-caption mt-1 text-graphite">
                Foreman app subscribers get $
                {(
                  (cohort.subscriber_discount_cents ?? 0) / 100
                ).toLocaleString()}{" "}
                off.
              </p>
            )}
          </div>
          <div>
            {isOpen ? (
              <Button asChild size="lg">
                <Link href={`/cohorts/${cohort.slug}/apply`}>
                  Apply now
                </Link>
              </Button>
            ) : isFull ? (
              <Button asChild size="lg" variant="secondary">
                <Link href={`/cohorts/${cohort.slug}/waitlist`}>
                  Join waitlist
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" disabled>
                Applications closed
              </Button>
            )}
          </div>
        </div>
      </section>

      {sessions.length > 0 ? (
        <section className="border-y border-rule bg-paper2">
          <div className="container max-w-3xl py-16">
            <p className="type-cap text-graphite">CURRICULUM</p>
            <h2 className="type-h1 mt-3 text-ink md:text-[32px]">
              Eight weeks, one rhythm.
            </h2>
            {cohort.curriculum_summary ? (
              <p className="type-body-lg mt-4 text-ink2">
                {cohort.curriculum_summary}
              </p>
            ) : null}
            <ol className="mt-8 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-chalk">
              {sessions.map((s) => {
                const mentor = s.guest_mentor_id
                  ? mentorById.get(s.guest_mentor_id)
                  : null;
                const localDate = new Date(s.scheduled_at).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                );
                return (
                  <li
                    key={s.session_number}
                    className="grid grid-cols-[50px_1fr] gap-4 p-4"
                  >
                    <div>
                      <p className="type-cap text-graphite">SESSION</p>
                      <p className="type-h2 leading-none text-ink">
                        {String(s.session_number).padStart(2, "0")}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {s.framework_phase ? (
                          <PhaseTag phase={s.framework_phase} />
                        ) : null}
                        <span className="type-caption text-graphite">
                          {localDate}
                        </span>
                      </div>
                      <p className="type-label text-ink">{s.title}</p>
                      {mentor ? (
                        <p className="type-caption mt-1 text-oak-dim">
                          Guest mentor: {mentor.name}
                          {mentor.title ? `, ${mentor.title}` : ""}
                          {mentor.company ? ` @ ${mentor.company}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : null}

      {mentors.length > 0 ? (
        <section className="container max-w-3xl py-16">
          <p className="type-cap text-graphite">GUEST MENTORS</p>
          <h2 className="type-h1 mt-3 text-ink md:text-[32px]">
            Real practitioners, not life coaches.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {mentors.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-rule bg-chalk p-5"
              >
                <p className="type-h2 text-ink">{m.name}</p>
                {m.title || m.company ? (
                  <p className="type-cap mt-1 text-oak-dim">
                    {[m.title, m.company].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {m.bio ? (
                  <p className="type-body mt-3 text-ink2">{m.bio}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-rule bg-paper2">
        <div className="container max-w-3xl py-16">
          <p className="type-cap text-graphite">THE COMMITMENT</p>
          <h2 className="type-h1 mt-3 text-ink md:text-[28px]">
            What you&apos;re signing up for.
          </h2>
          <ul className="mt-6 space-y-3">
            {COMMITMENTS.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 type-body text-ink2"
              >
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-oak" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {isOpen ? (
              <Button asChild size="lg">
                <Link href={`/cohorts/${cohort.slug}/apply`}>Apply now</Link>
              </Button>
            ) : isFull ? (
              <Button asChild size="lg" variant="secondary">
                <Link href={`/cohorts/${cohort.slug}/waitlist`}>
                  Join waitlist
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

const COMMITMENTS = [
  "Eight 90-minute sessions, every Saturday at 10am Mountain Time. Sessions are live; missing 3+ forfeits the completion certificate.",
  "Twelve participants per cohort. You bring real situations from your week; the group works them with you.",
  "A guest mentor joins for two sessions and offers 30-minute 1:1 slots between weeks 3 and 7.",
  "Free Foreman app access through the cohort and four weeks after — then a $15/mo alumni rate if you want to keep going.",
  "Refunds: full refund before session 2. After that, no refund.",
];

function PublicHeader() {
  return (
    <header className="border-b border-rule">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Foreman home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/cohorts"
            className="type-label text-graphite hover:text-ink"
          >
            All cohorts
          </Link>
          <Link
            href="/login"
            className="type-label text-graphite hover:text-ink"
          >
            Log in
          </Link>
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
        <Link
          href="/cohorts"
          className="type-label text-graphite hover:text-ink"
        >
          All cohorts
        </Link>
      </div>
    </footer>
  );
}
