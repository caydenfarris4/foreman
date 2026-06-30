"use client";

// The centerpiece: the five-stage "build your house" journey.
//
// - The hero house reads a single `build` motion value. On open it animates
//   from an empty lot up to the user's real progress ("watch your house rise to
//   where you actually are"); whenever a goal completes and the data refreshes,
//   it springs to the new level.
// - GSAP ScrollTrigger draws a blueprint plumb-line down the stages as you
//   scroll and gives the hero a gentle parallax — the scroll-driven sequence.
// - Each stage owns its goal levels and writes through the existing actions.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  animate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { Reveal } from "@/lib/motion";
import type { GoalLevel, GrowthGoal } from "@/lib/database.types";
import { HouseScene } from "./house-scene";
import { StageSection, type StageActions } from "./stage-section";
import {
  STAGES,
  buildPhaseLabel,
  computeBuild,
  type BuildState,
} from "./progress";

// Top level has no parent; everything else ladders up one level. Used only to
// flag demo goals as connected/disconnected (mirrors the server action).
const PARENT_LEVEL: Record<GoalLevel, GoalLevel | null> = {
  ten_year: null,
  five_year: "ten_year",
  six_month: "five_year",
  monthly: "six_month",
  weekly: "monthly",
  daily: "weekly",
};

export function PlanJourney({
  goals,
  build,
  tenYearText,
  demo = false,
}: {
  goals: GrowthGoal[];
  build: BuildState;
  tenYearText: string | null;
  // Dev-only: drive add/complete/delete through local state (no Supabase) so
  // the journey is fully interactive in the /preview route. Production passes
  // the real server-backed goals and leaves this false.
  demo?: boolean;
}) {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);

  // In demo mode goals live in local state; otherwise they come straight from
  // the server-rendered props.
  const [demoGoals, setDemoGoals] = useState<GrowthGoal[]>(goals);
  const effectiveGoals = demo ? demoGoals : goals;
  const effectiveBuild = demo ? computeBuild(demoGoals) : build;

  const demoActions = useMemo<StageActions>(
    () => ({
      addGoal: async (input) => {
        const { level, body, parent_goal_id } = input as {
          level: GoalLevel;
          body: string;
          parent_goal_id: string | null;
        };
        setDemoGoals((g) => [
          ...g,
          {
            id: crypto.randomUUID(),
            user_id: "demo",
            plan_id: "demo",
            level,
            parent_goal_id: parent_goal_id ?? null,
            body,
            status: "open",
            period_start: null,
            period_end: null,
            ladders_up: PARENT_LEVEL[level] === null || !!parent_goal_id,
            created_at: new Date().toISOString(),
            updated_at: null,
          },
        ]);
        return { ok: true };
      },
      setGoalStatus: async (input) => {
        const { id, status } = input as { id: string; status: "open" | "done" };
        setDemoGoals((g) =>
          g.map((x) => (x.id === id ? { ...x, status } : x)),
        );
        return { ok: true };
      },
      deleteGoal: async (input) => {
        const { id } = input as { id: string };
        setDemoGoals((g) => g.filter((x) => x.id !== id));
        return { ok: true };
      },
    }),
    [],
  );

  const houseBuild = useMotionValue(reduce ? effectiveBuild.overall : 0);

  // Build the house up to real progress on open, and re-settle when progress
  // changes (a completed goal). Honors reduced motion (snaps, no animation).
  useEffect(() => {
    if (reduce) {
      houseBuild.set(effectiveBuild.overall);
      return;
    }
    const controls = animate(houseBuild, effectiveBuild.overall, {
      duration: 1.7,
      ease: [0.22, 0.61, 0.36, 1],
    });
    return () => controls.stop();
  }, [effectiveBuild.overall, reduce, houseBuild]);

  // GSAP scroll sequence: the plumb-line draw + hero parallax. Loaded client-
  // side only; skipped entirely under reduced motion.
  useEffect(() => {
    if (reduce) return;
    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        if (railFillRef.current && stagesRef.current) {
          gsap.fromTo(
            railFillRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: stagesRef.current,
                start: "top 70%",
                end: "bottom 80%",
                scrub: 0.6,
              },
            },
          );
        }
        if (heroRef.current) {
          gsap.to(heroRef.current, {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }
      });
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [reduce]);

  const phase = buildPhaseLabel(effectiveBuild.overall);

  return (
    <div>
      {/* Hero */}
      <div ref={heroRef} className="px-1">
        <HouseScene progress={houseBuild} realOverall={effectiveBuild.overall} />
        {effectiveBuild.totalGoals === 0 ? (
          <div className="mt-3 rounded-lg border border-oak/30 bg-oak-wash p-3.5">
            <p className="type-cap text-oak-dim">FOUNDATION LAID</p>
            <p className="type-body-sm mt-1 text-ink2">
              Your foundation is poured — because you finished your blueprint.
              Lay your first board below and the house keeps rising.
            </p>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-rule bg-chalk p-4">
            <p className="type-cap text-graphite">BUILD PHASE</p>
            <p className="type-h2 mt-1.5 text-ink">{phase}</p>
            <p className="type-caption mt-1 text-graphite">
              {effectiveBuild.totalDone} of {effectiveBuild.totalGoals} goals
              complete
            </p>
          </div>
          <div className="rounded-lg border border-rule bg-chalk p-4">
            <p className="type-cap text-graphite">STAGES STARTED</p>
            <p className="type-h2 mt-1.5 text-ink">
              {effectiveBuild.reached}
              <span className="type-spec text-graphite"> / {STAGES.length}</span>
            </p>
            <p className="type-caption mt-1 text-graphite">
              {effectiveBuild.reached === STAGES.length
                ? "Every level has work in it."
                : "Draw the next level to keep building."}
            </p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href="/app/plan/checkin"
            className="flex items-center justify-between rounded-lg bg-ink p-4 text-chalk transition-colors hover:bg-[#2A2620]"
          >
            <span>
              <span className="type-cap text-chalk/55">CASCADE CHECK-IN</span>
              <span className="type-label mt-1 block">Work today&apos;s goals</span>
            </span>
            <span className="type-label">Open →</span>
          </Link>
          <Link
            href="/app/inspection"
            className="flex items-center justify-between rounded-lg border border-oak bg-oak-wash p-4 text-ink transition-colors hover:bg-oak/20"
          >
            <span>
              <span className="type-cap text-oak-dim">GROWTH INSPECTION</span>
              <span className="type-label mt-1 block">Walk the site</span>
            </span>
            <span className="type-label text-oak-dim">Open →</span>
          </Link>
        </div>
      </div>

      {/* The five stages */}
      <Reveal as="fade" className="mt-8 px-1">
        <p className="type-cap text-blueprint">THE BUILD · FIVE STAGES</p>
        <h2 className="type-h2 mt-1 text-ink">From the vision down to today</h2>
        <p className="type-body-sm mt-1 text-graphite">
          Each stage lays the ground for the next. Scroll the plan and watch the
          house take shape.
        </p>
      </Reveal>

      <div ref={stagesRef} className="relative mt-4">
        {/* Blueprint plumb-line */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-[15px] top-3 w-px bg-rule"
        />
        <div
          ref={railFillRef}
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-[15px] top-3 w-px origin-top bg-blueprint"
          style={{ transform: "scaleY(0)" }}
        />

        <div className="space-y-5 pl-9">
          {effectiveBuild.stages.map((sp) => (
            <Reveal key={sp.def.key} as="boardUp" amount={0.25}>
              <StageSection
                def={sp.def}
                goals={effectiveGoals}
                stageProgress={sp}
                northStar={sp.def.key === "vision" ? tenYearText : null}
                actions={demo ? demoActions : undefined}
                skipRefresh={demo}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
