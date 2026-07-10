import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectInspectionQuestions } from "@/lib/inspection/questions";
import {
  daysUntilInspection,
  inspectionDueAt,
  isInspectionDue,
} from "@/lib/inspection/evidence";
import type {
  Inspection,
  PrincipleSelection,
  Profile,
} from "@/lib/database.types";
import { Instrument } from "./instrument";

type InspectionRow = Pick<
  Inspection,
  | "id"
  | "cycle_number"
  | "is_baseline"
  | "status"
  | "flag_status"
  | "generated_report"
  | "cayden_note"
  | "sent_at"
  | "trajectory_read"
>;

// trajectory_read jsonb carries the scoring read plus the frozen growth
// record captured when the inspection ran (see the submit route).
type TrajectoryJson = {
  overall?: "narrowing" | "steady" | "widening" | "baseline";
  growth_stats?: { label: string; value: number }[];
} | null;

const TRAJECTORY_CHIP: Record<
  string,
  { label: string; className: string }
> = {
  narrowing: { label: "Gap narrowing", className: "bg-moss-wash text-moss ring-moss/25" },
  steady: { label: "Holding steady", className: "bg-oak-wash text-oak-dim ring-oak/25" },
  widening: { label: "Gap widening", className: "bg-rust/10 text-rust ring-rust/25" },
  baseline: { label: "Baseline set", className: "bg-oak-wash text-oak-dim ring-oak/25" },
};

function reportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="type-body-lg leading-[1.6] text-ink">
          {p}
        </p>
      ))}
    </>
  );
}

export default async function InspectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Pick<Profile, "name"> | null;
  if (!profile) redirect("/onboarding");

  // Need a plan + weighted principles first.
  const { data: planRow } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  const planId = (planRow as { id: string } | null)?.id ?? null;
  const { data: selRows } = planId
    ? await supabase
        .from("principle_selections")
        .select("principle")
        .eq("plan_id", planId)
    : { data: [] };
  const weighted = ((selRows ?? []) as Pick<PrincipleSelection, "principle">[]).map(
    (s) => s.principle,
  );

  // Every inspection, newest first. Sent reports are readable under RLS with
  // the user's own client; the service-role client only adds visibility into
  // a draft sitting in review. If it's unavailable (e.g. the runtime secret
  // is missing on the worker), degrade to the sent view instead of crashing.
  const INSPECTION_COLUMNS =
    "id, cycle_number, is_baseline, status, flag_status, generated_report, cayden_note, sent_at, trajectory_read";
  const { data: ownRows } = await supabase
    .from("inspections")
    .select(INSPECTION_COLUMNS)
    .eq("user_id", user.id)
    .order("cycle_number", { ascending: false })
    .limit(20);
  let all = (ownRows ?? []) as InspectionRow[];
  try {
    const admin = createAdminClient();
    const { data: adminRows, error: adminError } = await admin
      .from("inspections")
      .select(INSPECTION_COLUMNS)
      .eq("user_id", user.id)
      .order("cycle_number", { ascending: false })
      .limit(20);
    if (!adminError && adminRows) all = adminRows as InspectionRow[];
  } catch (err) {
    console.error("Inspection page: service-role read unavailable", err);
  }
  const latest = all[0] as InspectionRow | undefined;
  const sentReports = all.filter((i) => i.status === "sent" && i.generated_report);

  const Header = (
    <header className="px-1">
      <p className="type-cap text-oak-dim">GROWTH INSPECTION</p>
      <h1 className="type-h1 mt-2 text-ink">Walk the site.</h1>
    </header>
  );

  const History =
    sentReports.length > 1 ? (
      <div className="space-y-2">
        <p className="type-cap px-1 text-graphite">PAST WALK-THROUGHS</p>
        {sentReports.slice(1).map((r) => (
          <details key={r.id} className="rounded-lg border border-rule bg-chalk">
            <summary className="cursor-pointer list-none p-4">
              <span className="type-label text-ink">
                {r.is_baseline ? "Baseline" : `Cycle ${r.cycle_number}`}
              </span>
              {r.sent_at ? (
                <span className="type-caption ml-2 text-graphite">
                  {reportDate(r.sent_at)}
                </span>
              ) : null}
            </summary>
            <div className="space-y-3 border-t border-rule p-4">
              <Prose text={r.generated_report ?? ""} />
              {r.cayden_note ? (
                <div className="border-t border-rule pt-3">
                  <p className="type-cap text-oak-dim">A NOTE FROM CAYDEN</p>
                  <div className="mt-2 space-y-3">
                    <Prose text={r.cayden_note} />
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    ) : null;

  if (!planId || weighted.length < 2) {
    return (
      <div className="space-y-5 px-3 pb-8 pt-6">
        {Header}
        <div className="rounded-lg border border-rule bg-chalk p-5">
          <p className="type-body text-graphite">
            The inspection measures your trajectory against the plan you set.
            Draw your blueprint first: your direction and the principles you
            want to master.
          </p>
          <Link
            href="/app/plan"
            className="type-label mt-3 inline-block text-oak-dim hover:text-ink"
          >
            Go to your plan →
          </Link>
        </div>
      </div>
    );
  }

  // An inspection is drafted and awaiting review.
  if (latest && latest.status !== "sent" && latest.flag_status === "routed") {
    return (
      <div className="space-y-5 px-3 pb-8 pt-6">
        {Header}
        <div className="rounded-lg border border-oak bg-oak-wash p-5">
          <p className="type-cap text-oak-dim">IN REVIEW</p>
          <h2 className="type-h2 mt-2 text-ink">Your walk-through is being read.</h2>
          <p className="type-body mt-2 text-graphite">
            Your answers are in. This report is getting a personal review before
            it reaches you. You will get an email the moment it is ready here.
          </p>
        </div>
        {sentReports.length ? (
          <div className="space-y-2">
            <p className="type-cap px-1 text-graphite">PAST WALK-THROUGHS</p>
            {sentReports.map((r) => (
              <details key={r.id} className="rounded-lg border border-rule bg-chalk">
                <summary className="cursor-pointer list-none p-4">
                  <span className="type-label text-ink">
                    {r.is_baseline ? "Baseline" : `Cycle ${r.cycle_number}`}
                  </span>
                  {r.sent_at ? (
                    <span className="type-caption ml-2 text-graphite">
                      {reportDate(r.sent_at)}
                    </span>
                  ) : null}
                </summary>
                <div className="space-y-3 border-t border-rule p-4">
                  <Prose text={r.generated_report ?? ""} />
                </div>
              </details>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // A sent report exists: the report is the page. The next walk-through is
  // gated by the firm six-month cycle (mirrored server-side in the API).
  if (latest && latest.status === "sent" && latest.generated_report) {
    const traj = latest.trajectory_read as TrajectoryJson;
    const chip = traj?.overall ? TRAJECTORY_CHIP[traj.overall] : null;
    const stats = traj?.growth_stats ?? [];
    const due = isInspectionDue(latest.sent_at);
    const daysLeft = latest.sent_at ? daysUntilInspection(latest.sent_at) : 0;
    const unlockDate = latest.sent_at
      ? reportDate(inspectionDueAt(latest.sent_at))
      : null;

    return (
      <div className="space-y-5 px-3 pb-8 pt-6">
        {Header}
        <article className="overflow-hidden rounded-lg border border-rule bg-chalk">
          <div className="border-b border-rule p-5">
            <p className="type-cap text-graphite">
              {latest.is_baseline ? "BASELINE" : `CYCLE ${latest.cycle_number}`} ·
              SITE REPORT
              {latest.sent_at ? ` · ${reportDate(latest.sent_at).toUpperCase()}` : ""}
            </p>
            <h2 className="type-h1 mt-2 text-ink">The walk-through.</h2>
            {chip ? (
              <span
                className={`type-label mt-3 inline-block rounded-full px-3 py-1 ring-1 ${chip.className}`}
              >
                {chip.label}
              </span>
            ) : null}
          </div>

          {/* The record: what they actually logged this cycle. Growth made
              visible before a single sentence of the read. */}
          {stats.length ? (
            <div className="border-b border-rule bg-paper2/40 p-5">
              <p className="type-cap text-graphite">THE RECORD · THIS CYCLE</p>
              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="type-h2 text-[24px] leading-none text-ink">
                      {s.value}
                    </p>
                    <p className="type-caption mt-1 text-graphite">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="type-caption mt-3 border-t border-rule pt-3 text-graphite">
                Every claim in this report points back to work you logged.
              </p>
            </div>
          ) : null}

          <div className="space-y-3 p-5">
            <Prose text={latest.generated_report} />
            {latest.cayden_note ? (
              <div className="mt-2 rounded-lg bg-oak-wash p-4 ring-1 ring-oak/25">
                <p className="type-cap text-oak-dim">A NOTE FROM CAYDEN</p>
                <div className="mt-2 space-y-3">
                  <Prose text={latest.cayden_note} />
                </div>
              </div>
            ) : null}
          </div>
        </article>

        {due ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-oak bg-oak-wash p-5">
              <p className="type-cap text-oak-dim">SIX MONTHS ON THE BOOKS</p>
              <h2 className="type-h2 mt-2 text-ink">Time to walk the site again.</h2>
              <p className="type-body mt-2 text-graphite">
                Twenty-some questions, one honest sitting. The report reads
                your last six months back to you and points the next cycle.
              </p>
            </div>
            <Instrument
              questions={selectInspectionQuestions(weighted, latest.cycle_number + 1)}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-rule bg-chalk p-5">
            <p className="type-cap text-graphite">NEXT WALK-THROUGH</p>
            <p className="type-h2 mt-2 text-ink">
              Unlocks in {daysLeft} day{daysLeft === 1 ? "" : "s"}
              {unlockDate ? (
                <span className="type-spec text-graphite"> · {unlockDate}</span>
              ) : null}
            </p>
            <p className="type-body-sm mt-2 text-graphite">
              Inspections run on a firm six-month cycle. Until then the build is
              the daily check-in, the boards, and the weekly retro. That record
              is what the next report reads.
            </p>
          </div>
        )}

        {History}
      </div>
    );
  }

  // No inspection yet (or an abandoned in-progress one): the baseline is open.
  const cycleForSelection = latest ? latest.cycle_number : 1;
  return (
    <div className="space-y-5 px-3 pb-8 pt-6">
      {Header}
      <p className="px-1 type-body text-graphite">
        Twenty-some questions about where you stand. There are no wrong answers
        and no score. Be honest. It takes about ten minutes, and it sets the
        baseline every future report measures against.
      </p>
      <Instrument questions={selectInspectionQuestions(weighted, cycleForSelection)} />
    </div>
  );
}
