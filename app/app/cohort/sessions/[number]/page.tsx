import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Cohort,
  CohortParticipant,
  CohortSession,
  Mentor,
} from "@/lib/database.types";

// One cohort session: schedule, Zoom link, prep materials, recording.
// RLS already scopes cohort_sessions to enrolled participants.
export default async function SessionDetailPage(ctx: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await ctx.params;
  const sessionNumber = Number(number);
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > 8) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Active participation → its cohort's session N.
  const { data: cpRows } = await supabase
    .from("cohort_participants")
    .select("cohort_id, status, cohorts(name, start_date)")
    .eq("user_id", user.id)
    .in("status", ["paid", "enrolled", "completed"]);
  const cp = ((cpRows ?? []) as unknown as (Pick<
    CohortParticipant,
    "cohort_id" | "status"
  > & { cohorts: Pick<Cohort, "name" | "start_date"> | null })[])[0];
  if (!cp) redirect("/app/cohort");

  const { data: sessRow } = await supabase
    .from("cohort_sessions")
    .select("*")
    .eq("cohort_id", cp.cohort_id)
    .eq("session_number", sessionNumber)
    .maybeSingle();
  const session = sessRow as CohortSession | null;
  if (!session) notFound();

  let mentor: Pick<Mentor, "name" | "title" | "company"> | null = null;
  if (session.guest_mentor_id) {
    const { data: mRow } = await supabase
      .from("mentors")
      .select("name, title, company")
      .eq("id", session.guest_mentor_id)
      .maybeSingle();
    mentor = mRow as Pick<Mentor, "name" | "title" | "company"> | null;
  }

  const when = new Date(session.scheduled_at);
  const isPast = when.getTime() < Date.now();

  return (
    <div className="space-y-4 px-3 pb-8 pt-6">
      <Link href="/app/cohort" className="type-label px-1 text-graphite hover:text-ink">
        ‹ {cp.cohorts?.name ?? "Your cohort"}
      </Link>

      <header className="px-1">
        <p className="type-cap text-oak-dim">
          SESSION {session.session_number} OF 8
          {session.framework_phase ? ` · ${session.framework_phase.toUpperCase()}` : ""}
        </p>
        <h1 className="type-h1 mt-2 text-ink">{session.title}</h1>
        <p className="type-caption mt-2 text-graphite">
          {when.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/Denver",
          })}{" "}
          · 10:00 AM MT · {session.duration_minutes ?? 90} minutes
        </p>
        {mentor ? (
          <p className="type-caption mt-1 text-graphite">
            Guest mentor: {mentor.name}
            {mentor.title ? `, ${mentor.title}` : ""}
            {mentor.company ? ` (${mentor.company})` : ""}
          </p>
        ) : null}
      </header>

      {!isPast && session.meeting_url ? (
        <a
          href={session.meeting_url}
          target="_blank"
          rel="noreferrer"
          className="type-label mx-1 inline-block rounded-lg bg-blueprint px-4 py-2.5 text-[oklch(0.98_0.01_80)] transition-colors hover:bg-blueprint-dim"
        >
          Join on Zoom →
        </a>
      ) : null}

      {session.description ? (
        <div className="rounded-xl border border-rule bg-chalk p-5">
          <p className="type-cap text-graphite">WHAT THIS SESSION COVERS</p>
          <p className="type-body-sm mt-2 whitespace-pre-wrap text-ink2">
            {session.description}
          </p>
        </div>
      ) : null}

      {session.prep_materials ? (
        <div className="rounded-xl border border-rule bg-chalk p-5">
          <p className="type-cap text-graphite">PREP · BEFORE THE SESSION</p>
          <p className="type-body-sm mt-2 whitespace-pre-wrap text-ink2">
            {session.prep_materials}
          </p>
        </div>
      ) : null}

      {session.recording_url ? (
        <div className="surface-ink rounded-xl p-5">
          <p className="type-cap text-oak">RECORDING</p>
          <p className="type-body-sm mt-2 text-[oklch(0.95_0.01_80)]">
            Missed it, or want the second pass? The full session is here.
          </p>
          <a
            href={session.recording_url}
            target="_blank"
            rel="noreferrer"
            className="type-label mt-3 inline-block rounded-lg bg-blueprint px-4 py-2.5 text-[oklch(0.98_0.01_80)] transition-colors hover:bg-blueprint-dim"
          >
            Watch the recording →
          </a>
        </div>
      ) : isPast ? (
        <p className="type-caption px-1 text-graphite">
          Recording lands here within a couple of hours of the session.
        </p>
      ) : null}
    </div>
  );
}
