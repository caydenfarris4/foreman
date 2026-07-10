import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Cohort,
  CohortParticipant,
  Mentor,
  OfficeHoursBooking,
} from "@/lib/database.types";
import { BookingForm } from "./booking-form";

// Mentor office hours: one 30-minute 1:1 per participant, weeks 3–7
// (COHORT_BRIEF phase 8). The participant proposes a time; the mentor
// confirms by email — no external scheduling service in v1.
export default async function OfficeHoursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cpRows } = await supabase
    .from("cohort_participants")
    .select("id, cohort_id, status, cohorts(name, start_date, end_date, status)")
    .eq("user_id", user.id)
    .in("status", ["paid", "enrolled"]);
  const cp = ((cpRows ?? []) as unknown as (Pick<
    CohortParticipant,
    "id" | "cohort_id" | "status"
  > & {
    cohorts: Pick<Cohort, "name" | "start_date" | "end_date" | "status"> | null;
  })[]).find((r) => r.cohorts?.status === "in_progress");
  if (!cp || !cp.cohorts) redirect("/app/cohort");

  // Window: weeks 3–7 of the run.
  const startMs = new Date(`${cp.cohorts.start_date}T00:00:00Z`).getTime();
  const weekNo = Math.floor((Date.now() - startMs) / (7 * 86400_000)) + 1;
  if (weekNo < 3 || weekNo > 7) redirect("/app/cohort");

  // The cohort's guest mentor: session 3's, else session 6's.
  const { data: mentorSessions } = await supabase
    .from("cohort_sessions")
    .select("session_number, guest_mentor_id")
    .eq("cohort_id", cp.cohort_id)
    .not("guest_mentor_id", "is", null)
    .order("session_number", { ascending: true });
  const mentorId = ((mentorSessions ?? []) as {
    guest_mentor_id: string | null;
  }[])[0]?.guest_mentor_id;

  let mentor: Pick<Mentor, "id" | "name" | "title" | "company" | "bio"> | null =
    null;
  if (mentorId) {
    const { data: mRow } = await supabase
      .from("mentors")
      .select("id, name, title, company, bio")
      .eq("id", mentorId)
      .maybeSingle();
    mentor = mRow as Pick<Mentor, "id" | "name" | "title" | "company" | "bio"> | null;
  }

  const { data: existingRows } = await supabase
    .from("office_hours_bookings")
    .select("*")
    .eq("participant_id", cp.id)
    .in("status", ["scheduled", "rescheduled"]);
  const existing = ((existingRows ?? []) as OfficeHoursBooking[])[0] ?? null;

  // Booking window bounds for the form (weeks 3–7).
  const windowStart = new Date(startMs + 2 * 7 * 86400_000);
  const windowEnd = new Date(startMs + 7 * 7 * 86400_000);

  return (
    <div className="space-y-4 px-3 pb-8 pt-6">
      <Link href="/app/cohort" className="type-label px-1 text-graphite hover:text-ink">
        ‹ {cp.cohorts.name}
      </Link>
      <header className="px-1">
        <p className="type-cap text-oak-dim">MENTOR OFFICE HOURS</p>
        <h1 className="type-h1 mt-2 text-ink">Thirty minutes, one on one.</h1>
      </header>

      {mentor ? (
        <div className="rounded-xl border border-rule bg-chalk p-5">
          <p className="type-cap text-graphite">YOUR COHORT&apos;S MENTOR</p>
          <p className="type-h2 mt-1.5 text-ink">{mentor.name}</p>
          <p className="type-caption mt-0.5 text-graphite">
            {[mentor.title, mentor.company].filter(Boolean).join(" · ")}
          </p>
          {mentor.bio ? (
            <p className="type-body-sm mt-2 text-ink2">{mentor.bio}</p>
          ) : null}
        </div>
      ) : (
        <p className="type-body-sm px-1 text-graphite">
          Your cohort&apos;s mentor hasn&apos;t been assigned yet — check back
          after session 3.
        </p>
      )}

      {existing ? (
        <div className="rounded-xl bg-moss-wash p-5 ring-1 ring-moss/25">
          <p className="type-cap text-moss">BOOKED</p>
          <p className="type-body mt-2 text-ink">
            {new Date(existing.scheduled_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "America/Denver",
            })}{" "}
            ·{" "}
            {new Date(existing.scheduled_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Denver",
            })}{" "}
            MT
          </p>
          <p className="type-caption mt-2 text-graphite">
            The meeting link lands here (and by email) once your mentor
            confirms.
          </p>
        </div>
      ) : mentor ? (
        <BookingForm
          minISO={windowStart.toISOString().slice(0, 16)}
          maxISO={windowEnd.toISOString().slice(0, 16)}
        />
      ) : null}
    </div>
  );
}
