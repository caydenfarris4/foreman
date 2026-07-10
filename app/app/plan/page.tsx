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
import { BlueprintWizard } from "./blueprint-wizard";
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
    return <BlueprintWizard />;
  }

  const selectedKeys = selections.map((s) => s.principle);
  const build = computeBuild(goals, { hasPlan: true });

  return (
    <div className="space-y-6 px-3 pb-8 pt-6">
      <header className="px-1">
        <p className="type-cap text-oak-dim">YOUR BLUEPRINT</p>
        <h1 className="type-h1 mt-2 text-ink">Build your house.</h1>
      </header>

      {/* Centerpiece: the five-stage house journey + progressive build. The
          blueprint itself renders inside the journey as the house's anatomy
          (roof = vision … foundation = principles). */}
      <PlanJourney
        goals={goals}
        build={build}
        tenYearText={plan.ten_year_text}
        fiveYearText={plan.five_year_text}
        sixMonthText={plan.six_month_milestone}
        principleNames={selectedKeys.map((k) => principleByKey(k).name)}
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

      {/* Edit the blueprint (the panel up top links here). */}
      <section
        id="edit-blueprint"
        className="scroll-mt-16 overflow-hidden rounded-lg border border-rule bg-chalk"
      >
        <details>
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
