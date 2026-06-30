import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { principleByKey } from "@/lib/inspection/principles";
import type {
  GrowthGoal,
  GrowthPlan,
  PrincipleMapping,
  PrincipleSelection,
  Profile,
} from "@/lib/database.types";
import { BlueprintForm } from "./blueprint-form";
import { PrincipleMapper } from "./principle-mapper";
import { PlanJourney } from "./house/journey";
import { computeBuild } from "./house/progress";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) redirect("/onboarding");

  const { data: planRow } = await supabase
    .from("growth_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  const plan = planRow as GrowthPlan | null;

  let selections: PrincipleSelection[] = [];
  let mappings: PrincipleMapping[] = [];
  let goals: GrowthGoal[] = [];
  if (plan) {
    const [sel, map, gl] = await Promise.all([
      supabase.from("principle_selections").select("*").eq("plan_id", plan.id),
      supabase.from("principle_mappings").select("*").eq("plan_id", plan.id),
      supabase
        .from("growth_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);
    selections = (sel.data ?? []) as PrincipleSelection[];
    mappings = (map.data ?? []) as PrincipleMapping[];
    goals = (gl.data ?? []) as GrowthGoal[];
  }

  if (!plan) {
    return (
      <div className="space-y-6 px-3 pb-8 pt-6">
        <header className="px-1">
          <p className="type-cap text-oak-dim">YOUR BLUEPRINT</p>
          <h1 className="type-h1 mt-2 text-ink">Draw the plan first.</h1>
          <p className="type-body mt-2 text-graphite">
            Foreman measures your daily work against where you said you want to
            go. Start with the direction, then we build down to today.
          </p>
        </header>
        <BlueprintForm initial={null} />
      </div>
    );
  }

  const selectedKeys = selections.map((s) => s.principle);
  const build = computeBuild(goals);

  return (
    <div className="space-y-6 px-3 pb-8 pt-6">
      <header className="px-1">
        <p className="type-cap text-oak-dim">YOUR BLUEPRINT</p>
        <h1 className="type-h1 mt-2 text-ink">Build your house.</h1>
      </header>

      {/* Centerpiece: the five-stage house journey + progressive build. */}
      <PlanJourney
        goals={goals}
        build={build}
        tenYearText={plan.ten_year_text}
      />

      {/* Principle mapping (AI → user-confirmed). */}
      <PrincipleMapper
        planId={plan.id}
        existing={mappings.map((m) => ({
          principle: m.principle,
          layer: m.layer,
          ai_rationale: m.ai_rationale,
          source: m.source,
        }))}
      />

      {/* Blueprint details + edit */}
      <section className="overflow-hidden rounded-lg border border-rule bg-chalk">
        <BlueprintRow label="Ten-year direction" body={plan.ten_year_text} />
        <BlueprintRow label="Five-year milestones" body={plan.five_year_text} />
        <BlueprintRow label="Six-month milestone" body={plan.six_month_milestone} />
        <div className="border-t border-rule p-4">
          <p className="type-cap text-graphite">PRINCIPLES TO MASTER</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedKeys.length ? (
              selectedKeys.map((k) => (
                <span
                  key={k}
                  className="type-label rounded-full border border-ink/20 bg-paper2 px-3 py-1 text-ink2"
                >
                  {principleByKey(k).name}
                </span>
              ))
            ) : (
              <span className="type-caption text-graphite">None chosen yet.</span>
            )}
          </div>
        </div>
        <details className="border-t border-rule">
          <summary className="type-label cursor-pointer px-4 py-3 text-graphite hover:text-ink">
            Edit blueprint
          </summary>
          <div className="border-t border-rule p-4">
            <BlueprintForm
              initial={{
                ten_year_text: plan.ten_year_text,
                five_year_text: plan.five_year_text ?? "",
                six_month_milestone: plan.six_month_milestone ?? "",
                principles: selectedKeys,
              }}
            />
          </div>
        </details>
      </section>
    </div>
  );
}

function BlueprintRow({ label, body }: { label: string; body: string | null }) {
  return (
    <div className="border-b border-rule p-4">
      <p className="type-cap text-graphite">{label.toUpperCase()}</p>
      <p className="type-body-sm mt-1 whitespace-pre-wrap text-ink2">
        {body && body.trim() ? body : "—"}
      </p>
    </div>
  );
}
