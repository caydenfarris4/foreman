// The bridge between goal data and the house that builds itself.
//
// House metaphor → goal granularity (approved mapping):
//   The Vision        → ten-year + five-year   "What does the finished house look like?"
//   The Blueprint     → six-month milestone    "The structural plan."
//   Room Design       → monthly focus areas    "Designing each room."
//   Measurements      → weekly plans           "Precise specs and framing."
//   Materials & Build → daily tasks            "The hands-on work."
//
// As work accumulates at each level, `overall` climbs from 0 (empty lot) to 1
// (finished home). The visualization (2D and 3D) consumes only `overall` plus
// the per-stage scores, so the building logic lives here, once.
import type { GoalLevel, GrowthGoal } from "@/lib/database.types";

export type StageKey =
  | "vision"
  | "blueprint"
  | "rooms"
  | "measurements"
  | "build";

export interface StageDef {
  key: StageKey;
  index: number;
  /** Stage name in the house metaphor. */
  title: string;
  /** Short construction caption (mono). */
  cap: string;
  /** The coaching question that frames this stage. */
  question: string;
  /** One-line description of what the user does here. */
  blurb: string;
  /** Goal levels this stage owns (Vision owns two). */
  levels: GoalLevel[];
  /** Where "add a goal" in this stage writes to. */
  primaryLevel: GoalLevel;
  /** Noun for a single item, used in prompts ("a milestone", "a task"). */
  itemNoun: string;
}

export const STAGES: StageDef[] = [
  {
    key: "vision",
    index: 0,
    title: "The Vision",
    cap: "10-YEAR · WHO YOU BECOME",
    question: "What does the finished house look like?",
    blurb:
      "The aspirational picture — who you want to be, and the major markers on the way there.",
    levels: ["ten_year", "five_year"],
    primaryLevel: "five_year",
    itemNoun: "milestone",
  },
  {
    key: "blueprint",
    index: 1,
    title: "The Blueprint",
    cap: "6-MONTH · THE STRUCTURE",
    question: "How does the vision become a structural plan?",
    blurb:
      "The milestone the next inspection measures — the plan drawn to scale.",
    levels: ["six_month"],
    primaryLevel: "six_month",
    itemNoun: "milestone",
  },
  {
    key: "rooms",
    index: 2,
    title: "Room Design",
    cap: "MONTHLY · THE ROOMS",
    question: "Which rooms are you building this season?",
    blurb: "Monthly focus areas — each room taking shape inside the frame.",
    levels: ["monthly"],
    primaryLevel: "monthly",
    itemNoun: "focus area",
  },
  {
    key: "measurements",
    index: 3,
    title: "Measurements",
    cap: "WEEKLY · THE SPECS",
    question: "What are this week's precise measurements?",
    blurb: "Weekly work orders — dimensions, framing, the exact cuts.",
    levels: ["weekly"],
    primaryLevel: "weekly",
    itemNoun: "work order",
  },
  {
    key: "build",
    index: 4,
    title: "Materials & Build",
    cap: "DAILY · THE WORK",
    question: "What gets built today?",
    blurb: "The hands-on daily work — boards going up, the house rising.",
    levels: ["daily"],
    primaryLevel: "daily",
    itemNoun: "task",
  },
];

export const STAGE_COUNT = STAGES.length;

export interface StageProgress {
  def: StageDef;
  total: number;
  done: number;
  /** done / total, or 0 when empty. */
  ratio: number;
  hasGoals: boolean;
  /** 0..1 contribution to the overall build. */
  score: number;
  /**
   * Gentle progression cue — the previous stage has at least one goal. Never a
   * hard block (the cascade philosophy is "flag, don't block"); the UI uses it
   * to highlight the recommended next move.
   */
  unlocked: boolean;
}

export interface BuildState {
  stages: StageProgress[];
  /** 0..1 — drives the house visualization. */
  overall: number;
  /** How many stages have any goals — the current construction phase (0..5). */
  reached: number;
  totalGoals: number;
  totalDone: number;
}

// A stage that has goals contributes a floor (the plan is drawn) plus the
// fraction completed. This makes the house lift the moment you commit a goal,
// then fill in as you finish the work.
const STAGE_FLOOR = 0.35;

// Endowed progress (Nunes & Drèze): the moment a blueprint exists, the house is
// not an empty lot — the foundation is laid *because the user finished the
// blueprint*. The reason is surfaced in the UI; without it the effect vanishes.
export const FOUNDATION_FLOOR = 0.12;

export function computeBuild(
  goals: GrowthGoal[],
  opts: { hasPlan?: boolean } = {},
): BuildState {
  const active = goals.filter((g) => g.status !== "dropped");

  const stages: StageProgress[] = STAGES.map((def) => {
    const inStage = active.filter((g) => def.levels.includes(g.level));
    const total = inStage.length;
    const done = inStage.filter((g) => g.status === "done").length;
    const ratio = total > 0 ? done / total : 0;
    const hasGoals = total > 0;
    const score = hasGoals ? STAGE_FLOOR + (1 - STAGE_FLOOR) * ratio : 0;
    return { def, total, done, ratio, hasGoals, score, unlocked: false };
  });

  // Unlock cue cascades: first stage is always open; each later stage lights up
  // once the one before it has a goal.
  stages.forEach((s, i) => {
    s.unlocked = i === 0 || stages[i - 1].hasGoals;
  });

  const rawOverall =
    stages.reduce((sum, s) => sum + s.score, 0) / STAGE_COUNT;
  // Endowed floor once a blueprint exists, so a new planner sees a poured
  // foundation rather than an empty lot.
  const overall = opts.hasPlan ? Math.max(rawOverall, FOUNDATION_FLOOR) : rawOverall;
  const reached = stages.filter((s) => s.hasGoals).length;
  const totalGoals = active.length;
  const totalDone = active.filter((g) => g.status === "done").length;

  return { stages, overall, reached, totalGoals, totalDone };
}

/**
 * Human label for the current construction phase, derived from overall build.
 * Used in the hero ("Framing", "Finishing", …).
 */
export function buildPhaseLabel(overall: number): string {
  if (overall <= 0.001) return "Empty lot";
  if (overall < 0.18) return "Site survey";
  if (overall < 0.36) return "Foundation";
  if (overall < 0.56) return "Framing";
  if (overall < 0.76) return "Walls & roof";
  if (overall < 0.99) return "Finishing";
  return "Move-in ready";
}
