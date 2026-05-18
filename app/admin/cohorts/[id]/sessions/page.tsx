import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Cohort,
  CohortSession,
  Mentor,
} from "@/lib/database.types";
import { isUuid } from "@/lib/validation";
import { SessionRow } from "./session-row";

export default async function AdminSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  const cohort = cohortRow as Pick<Cohort, "id" | "name"> | null;
  if (!cohort) notFound();

  const { data: sessions } = await supabase
    .from("cohort_sessions")
    .select("*")
    .eq("cohort_id", id)
    .order("session_number", { ascending: true });
  const rows = (sessions ?? []) as CohortSession[];

  const { data: mentorsData } = await supabase
    .from("mentors")
    .select("id, name, title, company")
    .eq("active", true)
    .order("name", { ascending: true });
  const mentors = (mentorsData ?? []) as Pick<
    Mentor,
    "id" | "name" | "title" | "company"
  >[];

  return (
    <div className="space-y-6">
      <div>
        <p className="type-cap text-graphite">
          <Link
            href={`/admin/cohorts/${cohort.id}`}
            className="underline hover:text-ink"
          >
            ← {cohort.name}
          </Link>
        </p>
        <h1 className="type-h1 mt-1 text-ink">Sessions</h1>
        <p className="type-body mt-2 text-graphite">
          Edit titles, mentor assignments, Zoom links, and prep materials.
          Saves on blur.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((s) => (
          <SessionRow key={s.id} session={s} mentors={mentors} />
        ))}
        {rows.length === 0 ? (
          <p className="type-body text-graphite">
            No sessions yet. Use cohort create to auto-generate them.
          </p>
        ) : null}
      </div>
    </div>
  );
}
