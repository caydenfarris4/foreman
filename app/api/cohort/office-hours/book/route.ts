import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { Cohort, CohortParticipant } from "@/lib/database.types";

export const runtime = "nodejs";

// Book a 30-minute mentor office-hours slot (weeks 3–7, one active booking
// per participant). The participant proposes a time; confirmation happens
// over email in v1. Writes go through the admin client because
// office_hours_bookings has no client-write RLS policy (reads only).
const BodySchema = z.object({
  // datetime-local string from the form, interpreted as the user's local
  // wall time — we store the parsed instant.
  scheduled_at_local: z.string().min(10).max(32),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "office-hours-book");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a valid time" }, { status: 400 });
  }
  const scheduledAt = new Date(parsed.data.scheduled_at_local);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Pick a valid time" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Active in-progress participation only.
  const { data: cpRows } = await supabase
    .from("cohort_participants")
    .select("id, cohort_id, status, cohorts(start_date, status)")
    .eq("user_id", user.id)
    .in("status", ["paid", "enrolled"]);
  const cp = ((cpRows ?? []) as unknown as (Pick<
    CohortParticipant,
    "id" | "cohort_id" | "status"
  > & { cohorts: Pick<Cohort, "start_date" | "status"> | null })[]).find(
    (r) => r.cohorts?.status === "in_progress",
  );
  if (!cp || !cp.cohorts) {
    return NextResponse.json(
      { error: "Office hours are for enrolled participants of a running cohort" },
      { status: 403 },
    );
  }

  // Window: proposed time must land in weeks 3–7 of the run.
  const startMs = new Date(`${cp.cohorts.start_date}T00:00:00Z`).getTime();
  const t = scheduledAt.getTime();
  if (t < startMs + 2 * 7 * 86400_000 || t > startMs + 7 * 7 * 86400_000) {
    return NextResponse.json(
      { error: "Office hours run weeks 3 through 7 — pick a time in that window" },
      { status: 400 },
    );
  }

  // The cohort's guest mentor (earliest mentor-assigned session).
  const { data: mentorSessions } = await supabase
    .from("cohort_sessions")
    .select("guest_mentor_id")
    .eq("cohort_id", cp.cohort_id)
    .not("guest_mentor_id", "is", null)
    .order("session_number", { ascending: true })
    .limit(1);
  const mentorId = ((mentorSessions ?? []) as {
    guest_mentor_id: string | null;
  }[])[0]?.guest_mentor_id;
  if (!mentorId) {
    return NextResponse.json(
      { error: "Your cohort's mentor hasn't been assigned yet" },
      { status: 409 },
    );
  }

  const admin = createAdminClient();

  // One active booking per participant.
  const { data: existing } = await admin
    .from("office_hours_bookings")
    .select("id")
    .eq("participant_id", cp.id)
    .in("status", ["scheduled", "rescheduled"])
    .limit(1);
  if ((existing ?? []).length > 0) {
    return NextResponse.json(
      { error: "You already have a slot booked" },
      { status: 409 },
    );
  }

  const { error } = await admin.from("office_hours_bookings").insert({
    cohort_id: cp.cohort_id,
    participant_id: cp.id,
    mentor_id: mentorId,
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: 30,
    status: "scheduled",
    notes: parsed.data.note ?? null,
  });
  if (error) {
    console.error("Office hours insert failed", error.message);
    return NextResponse.json(
      { error: "Could not book the slot. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
