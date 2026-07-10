import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { createClient } from "@/lib/supabase/server";
import type { Cohort } from "@/lib/database.types";
import { formatCohortDateRange, isValidSlug } from "@/lib/cohorts";
import { WaitlistForm } from "./waitlist-form";

export default async function WaitlistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("cohorts")
    .select("name, slug, start_date, end_date, status")
    .eq("slug", slug)
    .in("status", ["open", "full", "in_progress", "completed"])
    .maybeSingle();
  const cohort = data as Pick<
    Cohort,
    "name" | "slug" | "start_date" | "end_date" | "status"
  > | null;
  if (!cohort) notFound();

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

      <section className="container max-w-xl pb-16 pt-16">
        <p className="type-cap text-graphite">
          WAITLIST · {formatCohortDateRange(cohort.start_date, cohort.end_date)}
        </p>
        <h1 className="type-h1 mt-3 text-ink md:text-[32px]">
          {cohort.name}
        </h1>
        <p className="type-body mt-3 text-graphite">
          This cohort is full. Drop your email and you&apos;ll get first
          dibs on applications for the next one. No spam.
        </p>
        <WaitlistForm cohortSlug={cohort.slug} />
      </section>
    </main>
  );
}
