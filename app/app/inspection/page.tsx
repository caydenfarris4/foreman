import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectInspectionQuestions } from "@/lib/inspection/questions";
import type {
  Inspection,
  PrincipleSelection,
  Profile,
} from "@/lib/database.types";
import { Instrument } from "./instrument";

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

  // Latest inspection of any status (service role: drafts are hidden by RLS).
  const admin = createAdminClient();
  const { data: latestRows } = await admin
    .from("inspections")
    .select(
      "id, cycle_number, is_baseline, status, flag_status, generated_report, sent_at, trajectory_read",
    )
    .eq("user_id", user.id)
    .order("cycle_number", { ascending: false })
    .limit(1);
  const latest = (latestRows ?? [])[0] as
    | Pick<
        Inspection,
        | "cycle_number"
        | "is_baseline"
        | "status"
        | "flag_status"
        | "generated_report"
        | "sent_at"
        | "trajectory_read"
      >
    | undefined;

  const Header = (
    <header className="px-1">
      <p className="type-cap text-oak-dim">GROWTH INSPECTION</p>
      <h1 className="type-h1 mt-2 text-ink">Walk the site.</h1>
    </header>
  );

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
            it reaches you. You will see it here once it is ready.
          </p>
        </div>
      </div>
    );
  }

  // A sent report exists: show it, with the option to run a fresh inspection.
  if (latest && latest.status === "sent" && latest.generated_report) {
    return (
      <div className="space-y-5 px-3 pb-8 pt-6">
        {Header}
        <article className="overflow-hidden rounded-lg border border-rule bg-chalk">
          <div className="border-b border-rule p-5">
            <p className="type-cap text-graphite">
              {latest.is_baseline ? "BASELINE" : `CYCLE ${latest.cycle_number}`} ·
              SITE REPORT
            </p>
            <h2 className="type-h1 mt-2 text-ink">The walk-through.</h2>
          </div>
          <div className="space-y-3 p-5">
            {latest.generated_report.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="type-body-lg leading-[1.6] text-ink">
                {p}
              </p>
            ))}
          </div>
        </article>
        <details>
          <summary className="type-label cursor-pointer text-graphite hover:text-ink">
            Run a new inspection
          </summary>
          <div className="mt-4">
            <Instrument
              questions={selectInspectionQuestions(weighted, latest.cycle_number + 1)}
            />
          </div>
        </details>
      </div>
    );
  }

  // No inspection yet (or an abandoned in-progress one): show the instrument.
  const cycleForSelection = latest ? latest.cycle_number : 1;
  return (
    <div className="space-y-5 px-3 pb-8 pt-6">
      {Header}
      <p className="px-1 type-body text-graphite">
        Twenty-some questions about where you stand. There are no wrong answers
        and no score. Be honest. It takes about ten minutes.
      </p>
      <Instrument questions={selectInspectionQuestions(weighted, cycleForSelection)} />
    </div>
  );
}
