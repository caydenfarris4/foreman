import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCohortDateRange } from "@/lib/cohorts";
import type {
  Cohort,
  CohortParticipant,
  CohortSession,
} from "@/lib/database.types";

// Participant home for the 8-week cohort program (COHORT_BRIEF phase 6).
// States: not applied → pitch; applied → under review; accepted → pay;
// paid/enrolled → the working dashboard; completed → archive.
export default async function CohortDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cpRows } = await supabase
    .from("cohort_participants")
    .select("*, cohorts(*)")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });
  const participations = ((cpRows ?? []) as unknown as (CohortParticipant & {
    cohorts: Cohort | null;
  })[]).filter((p) => p.cohorts);

  // The most relevant participation: enrolled/paid > accepted > applied >
  // completed (most recent first, already sorted).
  const rank: Record<string, number> = {
    enrolled: 0, paid: 1, accepted: 2, applied: 3, completed: 4, withdrew: 5, rejected: 6,
  };
  const current = [...participations].sort(
    (a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9),
  )[0];

  if (!current) {
    return (
      <Shell>
        <div className="rounded-xl border border-dashed border-ruleStrong bg-chalk/60 p-6">
          <p className="type-cap text-oak-dim">THE FOREMAN COHORT</p>
          <h2 className="type-h2 mt-2 text-ink">
            Twelve builders. Eight weeks. Cayden in the room.
          </h2>
          <p className="type-body-sm mt-2 text-graphite">
            A closed group program — weekly live sessions, a guest mentor, and
            the kind of accountability an app alone can&apos;t give you.
          </p>
          <Link
            href="/cohorts"
            className="type-label mt-4 inline-block rounded-lg bg-ink px-4 py-2.5 text-[oklch(0.97_0.01_80)] transition-colors hover:bg-[oklch(0.26_0.02_55)]"
          >
            See the next cohort →
          </Link>
        </div>
      </Shell>
    );
  }

  const cohort = current.cohorts as Cohort;

  if (current.status === "applied") {
    return (
      <Shell>
        <StatusCard
          cap="APPLICATION UNDER REVIEW"
          title={cohort.name}
          body="Cayden reads every application personally. You'll hear back within five business days."
        />
      </Shell>
    );
  }
  if (current.status === "accepted") {
    return (
      <Shell>
        <StatusCard
          cap="ACCEPTED · PAYMENT OPEN"
          title={`You're in, pending payment.`}
          body="Your seat is held for 7 days from acceptance. Complete payment to lock it in."
        />
        <Link
          href={`/cohorts/${cohort.slug}/apply`}
          className="type-label mt-3 inline-block rounded-lg bg-blueprint px-4 py-2.5 text-[oklch(0.98_0.01_80)] transition-colors hover:bg-blueprint-dim"
        >
          Complete payment →
        </Link>
      </Shell>
    );
  }

  // paid / enrolled / completed — the working dashboard.
  const { data: sessRows } = await supabase
    .from("cohort_sessions")
    .select("*")
    .eq("cohort_id", cohort.id)
    .order("session_number", { ascending: true });
  const sessions = (sessRows ?? []) as CohortSession[];
  const now = Date.now();
  const nextSession = sessions.find(
    (s) => new Date(s.scheduled_at).getTime() > now - 90 * 60 * 1000,
  );

  // Office hours window: weeks 3–7 of the run.
  const startMs = new Date(`${cohort.start_date}T00:00:00Z`).getTime();
  const weekNo = Math.floor((now - startMs) / (7 * 86400_000)) + 1;
  const officeHoursOpen =
    cohort.status === "in_progress" && weekNo >= 3 && weekNo <= 7;

  return (
    <Shell>
      <div className="rounded-xl border border-rule bg-chalk p-5">
        <p className="type-cap text-oak-dim">
          {current.status === "completed" ? "COHORT · COMPLETED" : "YOUR COHORT"}
        </p>
        <h2 className="type-h2 mt-1.5 text-ink">{cohort.name}</h2>
        <p className="type-caption mt-1 text-graphite">
          {formatCohortDateRange(cohort.start_date, cohort.end_date)} ·
          Saturdays · 10:00 AM MT
        </p>
        {current.free_app_access_until ? (
          <p className="type-caption mt-2 text-moss">
            Full Foreman access included through{" "}
            {new Date(current.free_app_access_until).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        ) : null}
      </div>

      {nextSession && current.status !== "completed" ? (
        <div className="surface-ink rounded-xl p-5">
          <p className="type-cap text-oak">
            NEXT SESSION · {nextSession.session_number} OF 8
          </p>
          <h3 className="type-h2 mt-1.5 text-[oklch(0.97_0.01_80)]">
            {nextSession.title}
          </h3>
          <p className="type-caption mt-1 text-[oklch(0.97_0.01_80/0.65)]">
            <LocalTime iso={nextSession.scheduled_at} /> (10:00 AM MT)
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextSession.meeting_url ? (
              <a
                href={nextSession.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="type-label rounded-lg bg-blueprint px-4 py-2.5 text-[oklch(0.98_0.01_80)] transition-colors hover:bg-blueprint-dim"
              >
                Join on Zoom →
              </a>
            ) : null}
            <Link
              href={`/app/cohort/sessions/${nextSession.session_number}`}
              className="type-label rounded-lg border border-[oklch(0.97_0.01_80/0.3)] px-4 py-2.5 text-[oklch(0.97_0.01_80)] transition-colors hover:bg-[oklch(0.97_0.01_80/0.1)]"
            >
              Prep materials
            </Link>
          </div>
        </div>
      ) : null}

      {officeHoursOpen ? (
        <Link
          href="/app/cohort/office-hours"
          className="flex items-center justify-between rounded-xl bg-moss-wash p-4 ring-1 ring-moss/25 transition-opacity hover:opacity-90"
        >
          <span>
            <span className="type-label block text-ink">Mentor office hours</span>
            <span className="type-caption text-graphite">
              30 minutes, 1:1 — open weeks 3 through 7
            </span>
          </span>
          <span className="type-label text-moss">Book →</span>
        </Link>
      ) : null}

      <section>
        <p className="type-cap px-1 text-graphite">ALL SESSIONS</p>
        <div className="mt-2 divide-y divide-ruleSoft rounded-lg border border-rule bg-chalk">
          {sessions.map((s) => {
            const past = new Date(s.scheduled_at).getTime() < now;
            return (
              <Link
                key={s.id}
                href={`/app/cohort/sessions/${s.session_number}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-paper2/50"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={
                      "type-cap w-5 text-center " +
                      (past ? "text-moss" : "text-graphite")
                    }
                  >
                    {s.session_number}
                  </span>
                  <span>
                    <span
                      className={
                        "type-label block " + (past ? "text-graphite" : "text-ink")
                      }
                    >
                      {s.title}
                    </span>
                    <span className="type-caption text-graphite">
                      <LocalTime iso={s.scheduled_at} short />
                      {s.recording_url ? " · recording available" : ""}
                    </span>
                  </span>
                </span>
                <span className="text-graphite">›</span>
              </Link>
            );
          })}
          {sessions.length === 0 ? (
            <p className="type-caption px-4 py-4 text-graphite">
              The session schedule lands here once the cohort opens.
            </p>
          ) : null}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 px-3 pb-8 pt-6">
      <header className="px-1">
        <h1 className="type-h1 text-ink">Cohort</h1>
      </header>
      {children}
    </div>
  );
}

function StatusCard({
  cap,
  title,
  body,
}: {
  cap: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-rule bg-chalk p-5">
      <p className="type-cap text-oak-dim">{cap}</p>
      <h2 className="type-h2 mt-1.5 text-ink">{title}</h2>
      <p className="type-body-sm mt-2 text-graphite">{body}</p>
    </div>
  );
}

// Server-rendered UTC-stable date; MT is noted alongside per the brief's
// quality bar. (Avoiding client hydration for simplicity.)
function LocalTime({ iso, short = false }: { iso: string; short?: boolean }) {
  const d = new Date(iso);
  return (
    <>
      {d.toLocaleDateString("en-US", {
        weekday: short ? "short" : "long",
        month: short ? "short" : "long",
        day: "numeric",
        timeZone: "America/Denver",
      })}
      {short ? "" : ` · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })} MT`}
    </>
  );
}
