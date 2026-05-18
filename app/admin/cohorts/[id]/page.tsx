import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Cohort, CohortSession } from "@/lib/database.types";
import {
  formatCohortDateRange,
  formatCohortPrice,
} from "@/lib/cohorts";
import { isUuid } from "@/lib/validation";
import { CohortStatusControl } from "./status-control";

export default async function AdminCohortDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const cohort = cohortRow as Cohort | null;
  if (!cohort) notFound();

  // Counts by status.
  const { data: pRows } = await supabase
    .from("cohort_participants")
    .select("status")
    .eq("cohort_id", id);
  const byStatus = new Map<string, number>();
  for (const p of (pRows ?? []) as { status: string }[]) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  }

  // Sessions.
  const { data: sessionsData } = await supabase
    .from("cohort_sessions")
    .select(
      "id, session_number, title, framework_phase, scheduled_at, meeting_url, guest_mentor_id",
    )
    .eq("cohort_id", id)
    .order("session_number", { ascending: true });
  const sessions = (sessionsData ?? []) as Pick<
    CohortSession,
    | "id"
    | "session_number"
    | "title"
    | "framework_phase"
    | "scheduled_at"
    | "meeting_url"
    | "guest_mentor_id"
  >[];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-cap text-graphite">
            COHORT · /{cohort.slug}
          </p>
          <h1 className="type-h1 mt-1 text-ink">{cohort.name}</h1>
          <p className="type-body mt-1 text-graphite">
            {formatCohortDateRange(cohort.start_date, cohort.end_date)} ·{" "}
            {formatCohortPrice(cohort.price_cents)} · capacity{" "}
            {cohort.capacity}
          </p>
        </div>
        <CohortStatusControl cohortId={cohort.id} status={cohort.status} />
      </div>

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip label="Applied" value={byStatus.get("applied") ?? 0} alert />
        <StatChip label="Accepted" value={byStatus.get("accepted") ?? 0} />
        <StatChip label="Paid" value={byStatus.get("paid") ?? 0} />
        <StatChip
          label="Enrolled / completed"
          value={
            (byStatus.get("enrolled") ?? 0) +
            (byStatus.get("completed") ?? 0)
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/cohorts/${cohort.id}/applications`}>
            Review applications →
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/cohorts/${cohort.id}/sessions`}>
            Edit sessions →
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/cohorts/${cohort.slug}`} target="_blank">
            View public page ↗
          </Link>
        </Button>
      </div>

      <section>
        <p className="type-cap text-graphite">SESSIONS</p>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-chalk">
          {sessions.length === 0 ? (
            <div className="p-4">
              <p className="type-body text-graphite">
                No sessions configured.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <Link
                key={s.id}
                href={`/admin/cohorts/${cohort.id}/sessions`}
                className="grid grid-cols-[40px_1fr_auto] items-center gap-3 p-3 hover:bg-paper2/40"
              >
                <span className="type-h2 leading-none text-ink">
                  {String(s.session_number).padStart(2, "0")}
                </span>
                <div>
                  <p className="type-label text-ink">{s.title}</p>
                  <p className="type-caption text-graphite">
                    {new Date(s.scheduled_at).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/Denver",
                      timeZoneName: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.guest_mentor_id ? (
                    <Badge variant="oak" size="sm">
                      Mentor
                    </Badge>
                  ) : null}
                  {s.meeting_url ? (
                    <Badge variant="neutral" size="sm">
                      Zoom set
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatChip({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        alert && value > 0
          ? "border-rust bg-rust-wash"
          : "border-rule bg-chalk"
      }`}
    >
      <p className="type-cap text-graphite">{label}</p>
      <p className="type-h2 mt-1 text-ink">{value}</p>
    </div>
  );
}
