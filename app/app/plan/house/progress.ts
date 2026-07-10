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
//
// 0.20 is deliberate: it lands inside the foundation's visual build window
// (0.12–0.30, so the slab is visibly poured, not a boundary artifact) AND
// inside buildPhaseLabel's "Foundation" band — so the badge, the house, and
// the "foundation laid" card all tell the same story.
export const FOUNDATION_FLOOR = 0.2;

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

// The single, unambiguous next action. The whole point: after the blueprint,
// the user should never face a flat wall of five stages wondering what to do —
// they get ONE open loop (Zeigarnik) and a clear instruction. Build order is
// top-down: room (monthly) → measurements (weekly) → materials (daily) → work
// today's boards. Vision and Blueprint are captured as plan text, so the
// frontier starts at Room Design.
export interface NextMove {
  stageKey: StageKey;
  level: GoalLevel;
  /** Imperative headline ("Design your first room"). */
  title: string;
  /** One sentence telling them exactly what to write/do. */
  instruction: string;
  /** Button label. */
  cta: string;
  /** 'add' opens the stage; 'complete' sends them to the cascade check-in. */
  kind: "add" | "complete";
}

export function nextMove(build: BuildState): NextMove {
  const byKey = Object.fromEntries(
    build.stages.map((s) => [s.def.key, s]),
  ) as Record<StageKey, StageProgress>;

  if (!byKey.rooms.hasGoals) {
    return {
      stageKey: "rooms",
      level: "monthly",
      title: "Design your first room",
      instruction:
        "Turn your six-month milestone into one focus for this month — the room you'll build first.",
      cta: "Add a monthly focus",
      kind: "add",
    };
  }
  if (!byKey.measurements.hasGoals) {
    return {
      stageKey: "measurements",
      level: "weekly",
      title: "Take this week's measurements",
      instruction:
        "What's the one work order this week that moves your monthly focus forward?",
      cta: "Add a weekly goal",
      kind: "add",
    };
  }
  if (!byKey.build.hasGoals) {
    return {
      stageKey: "build",
      level: "daily",
      title: "Lay today's first board",
      instruction: "Pick one small thing you can finish today. That's the work.",
      cta: "Add today's task",
      kind: "add",
    };
  }
  const openToday = byKey.build.total - byKey.build.done;
  if (openToday > 0) {
    return {
      stageKey: "build",
      level: "daily",
      title: "Work today's plan",
      instruction: `You have ${openToday} board${openToday > 1 ? "s" : ""} to lay today. Check one off and the house rises.`,
      cta: "Open today's check-in",
      kind: "complete",
    };
  }
  return {
    stageKey: "build",
    level: "daily",
    title: "Today's boards are up",
    instruction:
      "Nice work. Add tomorrow's task, or design next month's room to keep building.",
    cta: "Add another task",
    kind: "add",
  };
}

// The parent level each cascade level ladders up to (top level has none).
export const PARENT_OF: Record<GoalLevel, GoalLevel | null> = {
  ten_year: null,
  five_year: "ten_year",
  six_month: "five_year",
  monthly: "six_month",
  weekly: "monthly",
  daily: "weekly",
};

/**
 * Smart-default parent for a quick-added goal: the most recently created OPEN
 * goal at the level above (people cascade off the thing they just planned).
 * Null when nothing sensible exists — the gentle "doesn't connect" flag covers
 * that case; we never guess across dropped/done work.
 */
export function autoParentId(
  level: GoalLevel,
  goals: GrowthGoal[],
): string | null {
  const parentLevel = PARENT_OF[level];
  if (!parentLevel) return null;
  const open = goals.filter(
    (g) => g.level === parentLevel && g.status === "open",
  );
  if (open.length === 0) return null;
  return open.reduce((latest, g) =>
    g.created_at > latest.created_at ? g : latest,
  ).id;
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
