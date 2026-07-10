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
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { Reveal } from "@/lib/motion";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GoalLevel, GrowthGoal } from "@/lib/database.types";
import { addGoal } from "../actions";
import { HouseScene } from "./house-scene";
import { StageSection, type StageActions } from "./stage-section";
import {
  PARENT_OF,
  STAGES,
  autoParentId,
  buildPhaseLabel,
  computeBuild,
  nextMove,
  type BuildState,
  type NextMove,
  type StageKey,
} from "./progress";

export function PlanJourney({
  goals,
  build,
  tenYearText,
  fiveYearText = null,
  sixMonthText = null,
  principleNames = [],
  demo = false,
}: {
  goals: GrowthGoal[];
  build: BuildState;
  tenYearText: string | null;
  fiveYearText?: string | null;
  /** The plan's six-month milestone — anchors the first monthly quick-add. */
  sixMonthText?: string | null;
  /** Chosen principles (display names) — the foundation bar. */
  principleNames?: string[];
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
  // Demo mode mirrors production: the journey only ever renders with a plan.
  const effectiveBuild = demo
    ? computeBuild(demoGoals, { hasPlan: true })
    : build;

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
            ladders_up: PARENT_OF[level] === null || !!parent_goal_id,
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

  // The single clear next action, plus an accordion so the five stages aren't a
  // flat wall. Only the active (next-move) stage is open by default; the rest
  // collapse to a one-line summary. One open loop at a time.
  const move = nextMove(effectiveBuild);
  const [expanded, setExpanded] = useState<Set<StageKey>>(
    () => new Set<StageKey>([move.stageKey]),
  );
  useEffect(() => {
    setExpanded((prev) =>
      prev.has(move.stageKey) ? prev : new Set(prev).add(move.stageKey),
    );
  }, [move.stageKey]);

  function toggleStage(key: StageKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // When the user travels to a stage, the destination must RECEIVE them:
  // expand it, scroll to it, spotlight it, and open its add form with the
  // cursor ready — no hunting for a small "+ Add" link after landing.
  const [spotlightKey, setSpotlightKey] = useState<StageKey | null>(null);
  const spotlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    },
    [],
  );
  function goToNextMove() {
    setExpanded((prev) => new Set(prev).add(move.stageKey));
    setSpotlightKey(move.stageKey);
    if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    spotlightTimer.current = setTimeout(() => setSpotlightKey(null), 2600);
    requestAnimationFrame(() => {
      document
        .getElementById(`stage-${move.stageKey}`)
        ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

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

        {/* The blueprint, drawn as the house itself: roof = vision, walls =
            five-year, door level = six-month, foundation = principles. Each
            level jumps to its stage in the cascade below. */}
        <Reveal as="boardUp" className="mt-2.5">
          <BlueprintPanel
            vision={tenYearText}
            fiveYear={fiveYearText}
            sixMonth={sixMonthText}
            principles={principleNames}
          />
        </Reveal>
        {effectiveBuild.totalGoals === 0 ? (
          <div className="mt-3 rounded-lg border border-oak/30 bg-oak-wash p-3.5">
            <p className="type-cap text-oak-dim">FOUNDATION LAID</p>
            <p className="type-body-sm mt-1 text-ink2">
              Your foundation is poured — because you finished your blueprint.
              Design your first room below and the house keeps rising.
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

        {/* The one clear next move — the most important element after the
            house itself. For "add" moves the input lives RIGHT HERE in the
            card: type the goal, hit add, the house rises, and the card morphs
            to the next step. No traveling, no hunting. */}
        <Reveal as="panelRise" className="mt-2.5">
          <QuickAddCard
            move={move}
            goals={effectiveGoals}
            sixMonthText={sixMonthText}
            onAdd={async (body) => {
              const parent = autoParentId(move.level, effectiveGoals);
              const add = demo ? demoActions.addGoal : addGoal;
              return add({
                level: move.level,
                body,
                parent_goal_id: parent,
              });
            }}
            demo={demo}
            onBrowse={goToNextMove}
          />
        </Reveal>

        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href="/app/plan/checkin"
            className="flex items-center justify-between rounded-lg bg-ink p-4 text-chalk transition-colors hover:bg-[#2e2a24]"
          >
            <span>
              <span className="type-cap text-chalk/55">CHECK-INS</span>
              <span className="type-label mt-1 block">
                Daily · weekly · monthly
              </span>
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
          Your next move is up top. Open any stage below to add or check off
          work — one stage at a time.
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
                collapsed={!expanded.has(sp.def.key)}
                onHeaderClick={() => toggleStage(sp.def.key)}
                spotlight={spotlightKey === sp.def.key}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// The next-move card with the action built in. For "add" moves the goal input
// lives inside the card (Fogg: make the behavior trivially easy — act where
// the intent is). Submitting auto-links the goal to the freshest open parent
// (smart default), the data refreshes, the house rises, and the card morphs to
// the following move — so a brand-new user can build their whole first cascade
// from this one card. "Complete" moves link to the cascade check-in.
function QuickAddCard({
  move,
  goals,
  sixMonthText,
  onAdd,
  onBrowse,
  demo,
}: {
  move: NextMove;
  goals: GrowthGoal[];
  sixMonthText: string | null;
  onAdd: (body: string) => Promise<{ ok: boolean; error?: string }>;
  onBrowse: () => void;
  demo: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const noun =
    STAGES.find((s) => s.key === move.stageKey)?.itemNoun ?? "goal";

  // What this goal ladders up to — shown so the user writes in context.
  // Monthly anchors to the plan's six-month milestone when no goal rows exist
  // above it yet.
  const parentId = autoParentId(move.level, goals);
  const parentBody = parentId
    ? goals.find((g) => g.id === parentId)?.body ?? null
    : move.level === "monthly"
      ? sixMonthText
      : null;

  function submit() {
    const text = body.trim();
    if (text.length < 3) return;
    setError(null);
    start(async () => {
      const res = await onAdd(text);
      if (!res.ok) {
        setError(res.error ?? "Could not add it. Try again.");
        return;
      }
      setBody("");
      if (!demo) router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-blueprint/25 surface-blueprint p-5 shadow-lift">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={move.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <p className="type-cap text-blueprint">YOUR NEXT MOVE</p>
          <h2 className="type-h2 mt-1.5 text-ink">{move.title}</h2>
          <p className="type-body-sm mt-1.5 text-ink2">{move.instruction}</p>

          {move.kind === "add" ? (
            <div className="mt-4">
              {parentBody ? (
                <p className="type-caption mb-2 text-graphite">
                  <span className="type-cap text-blueprint/70">BUILDS ON · </span>
                  {parentBody.length > 90
                    ? `${parentBody.slice(0, 90)}…`
                    : parentBody}
                </p>
              ) : null}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder={`Write the ${noun}…`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="bg-chalk"
              />
              {error ? (
                <p className="type-caption mt-2 text-rust">{error}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3">
                <Button
                  size="md"
                  onClick={submit}
                  disabled={pending || body.trim().length < 3}
                >
                  {pending ? (
                    <>
                      <Spinner /> Placing…
                    </>
                  ) : (
                    `${move.cta} →`
                  )}
                </Button>
                <button
                  type="button"
                  onClick={onBrowse}
                  className="type-label text-graphite transition-colors hover:text-ink"
                >
                  Open the stage instead
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <Button asChild size="md">
                <Link href="/app#daily-checkin">{move.cta} →</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


// The plan rendered as the anatomy of the house — the mock's home-screen
// diagram made real. Prominent by design: everything below cascades from it.
function BlueprintPanel({
  vision,
  fiveYear,
  sixMonth,
  principles,
}: {
  vision: string | null;
  fiveYear: string | null;
  sixMonth: string | null;
  principles: string[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-chalk shadow-lift">
      {/* Roof — the ten-year vision holds everything up. */}
      <a href="#stage-vision" className="block transition-opacity hover:opacity-90">
        <div className="mx-auto h-9 w-[94%] bg-blueprint [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
        <div className="surface-blueprint px-5 pb-4 pt-3 text-center">
          <p className="type-cap text-blueprint">THE ROOF · 10-YEAR VISION</p>
          {vision ? (
            <p className="type-prompt mt-2 text-[18px] text-ink">
              &ldquo;{vision}&rdquo;
            </p>
          ) : (
            <p className="type-body-sm mt-2 text-graphite">
              Draw your ten-year direction to raise the roof.
            </p>
          )}
        </div>
      </a>

      {/* Upper walls — five-year milestones. */}
      <a
        href="#stage-vision"
        className="block border-t border-ruleSoft px-5 py-3.5 transition-colors hover:bg-paper2/50"
      >
        <p className="type-cap text-graphite">THE WALLS · FIVE-YEAR MILESTONES</p>
        <p className="type-body-sm mt-1 text-ink2">
          {fiveYear?.trim() ? fiveYear : "—"}
        </p>
      </a>

      {/* Door level — the six-month milestone you walk through next. */}
      <a
        href="#stage-blueprint"
        className="block border-t border-ruleSoft px-5 py-3.5 transition-colors hover:bg-paper2/50"
      >
        <p className="type-cap text-graphite">
          THE DOOR · SIX-MONTH MILESTONE
        </p>
        <p className="type-body-sm mt-1 text-ink2">
          {sixMonth?.trim() ? sixMonth : "—"}
        </p>
      </a>

      {/* Foundation — the principles everything rests on. */}
      <a
        href="#edit-blueprint"
        className="surface-ink block px-5 py-4 transition-opacity hover:opacity-95"
      >
        <p className="type-cap text-oak">
          {principles.length || "YOUR"} PRINCIPLE{principles.length === 1 ? "" : "S"} · YOUR FOUNDATION
        </p>
        {principles.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {principles.map((name) => (
              <span
                key={name}
                className="type-label rounded-full border border-[oklch(0.97_0.01_80/0.25)] px-3 py-1 text-[oklch(0.96_0.01_80)]"
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="type-caption mt-1.5 text-[oklch(0.95_0.01_80/0.7)]">
            Choose 2–4 principles to pour the foundation.
          </p>
        )}
      </a>
    </div>
  );
}
