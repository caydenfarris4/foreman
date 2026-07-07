"use client";

// DEV-ONLY preview of the "Build Your House" journey.
//
// This route exists so the goal-journey UX can be seen and clicked without
// Supabase auth or a seeded account — it mounts the REAL <PlanJourney> in demo
// mode (local-state goals) with mock data at a few build levels. It is excluded
// from the auth middleware and 404s in production. Not part of the product.
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/lib/motion";
import { PlanJourney } from "@/app/app/plan/house/journey";
import { BlueprintWizard } from "@/app/app/plan/blueprint-wizard";
import { computeBuild } from "@/app/app/plan/house/progress";
import type { GoalLevel, GoalStatus, GrowthGoal } from "@/lib/database.types";

let n = 0;
function g(level: GoalLevel, body: string, status: GoalStatus = "open"): GrowthGoal {
  n += 1;
  return {
    id: `seed-${n}`,
    user_id: "demo",
    plan_id: "demo",
    level,
    parent_goal_id: null,
    body,
    status,
    period_start: null,
    period_end: null,
    ladders_up: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
  };
}

const TEN_YEAR =
  "Become a leader people trust completely — someone whose word is good, who builds others up, and whose family and team are stronger for having been around him. A life that holds together under pressure.";

function seedFor(scenario: string): GrowthGoal[] {
  if (scenario === "empty") return [];
  if (scenario === "finished") {
    return [
      g("ten_year", "Trusted, steady leader", "done"),
      g("five_year", "Run a team of 20 with low turnover", "done"),
      g("five_year", "Mentor three people into leadership", "done"),
      g("six_month", "Ship the team operating rhythm", "done"),
      g("monthly", "Weekly 1:1s with every report", "done"),
      g("monthly", "Document the onboarding playbook", "done"),
      g("weekly", "Two deep-work blocks held", "done"),
      g("weekly", "Clear the review backlog", "done"),
      g("daily", "Morning planning ritual", "done"),
      g("daily", "One hard conversation, handled well", "done"),
    ];
  }
  // "progress" — a house mid-build.
  return [
    g("five_year", "Run a team of 20 with low turnover", "done"),
    g("five_year", "Mentor three people into leadership"),
    g("six_month", "Ship the team operating rhythm"),
    g("monthly", "Weekly 1:1s with every report", "done"),
    g("monthly", "Document the onboarding playbook"),
    g("monthly", "Define team values", "done"),
    g("weekly", "Two deep-work blocks held", "done"),
    g("weekly", "Clear the review backlog", "done"),
    g("weekly", "Draft Q3 goals"),
    g("daily", "Morning planning ritual", "done"),
    g("daily", "One hard conversation, handled well", "done"),
    g("daily", "Inbox to zero by noon"),
  ];
}

const SCENARIOS = [
  { key: "empty", label: "Empty lot" },
  { key: "progress", label: "Mid-build" },
  { key: "finished", label: "Finished" },
];

export default function HousePreviewPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_PREVIEW !== "1"
  ) {
    notFound();
  }

  const [scenario, setScenario] = useState("progress");
  const [view, setView] = useState<"journey" | "wizard">("journey");
  // Apply ?scenario= / ?view= after mount so SSR and first client render match
  // (no hydration mismatch).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("scenario");
    if (s && ["empty", "progress", "finished"].includes(s)) setScenario(s);
    if (params.get("view") === "wizard") setView("wizard");
  }, []);
  const seed = seedFor(scenario);

  return (
    <MotionProvider>
      <div className="min-h-screen bg-paper pb-24">
        {/* Preview toolbar (not part of the product) */}
        <div className="sticky top-0 z-50 border-b border-rule bg-chalk/90 backdrop-blur">
          <div className="container mx-auto flex max-w-2xl items-center justify-between gap-2 py-2.5">
            <span className="type-cap text-oak-dim">DEV PREVIEW · HOUSE</span>
            <div className="flex gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  data-testid={`scenario-${s.key}`}
                  onClick={() => setScenario(s.key)}
                  className={
                    "type-cap rounded-full border px-3 py-1 transition-colors " +
                    (scenario === s.key
                      ? "border-ink bg-ink text-chalk"
                      : "border-rule bg-paper text-graphite hover:text-ink")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="container mx-auto max-w-2xl px-3 pb-8 pt-6">
          <header className="px-1">
            <p className="type-cap text-oak-dim">YOUR BLUEPRINT</p>
            <h1 className="type-h1 mt-2 text-ink">Build your house.</h1>
          </header>

          <div className="mt-6">
            {view === "wizard" ? (
              <BlueprintWizard />
            ) : (
              /* Remount per scenario so the on-open construction animation
                 replays and local demo state reseeds. */
              <PlanJourney
                key={scenario}
                demo
                goals={seed}
                build={computeBuild(seed, { hasPlan: true })}
                tenYearText={TEN_YEAR}
              />
            )}
          </div>
        </main>
      </div>
    </MotionProvider>
  );
}
