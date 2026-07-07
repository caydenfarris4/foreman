import { describe, it, expect } from "vitest";
import {
  computeBuild,
  buildPhaseLabel,
  nextMove,
  FOUNDATION_FLOOR,
  STAGES,
} from "@/app/app/plan/house/progress";
import type { GoalLevel, GoalStatus, GrowthGoal } from "@/lib/database.types";

let seq = 0;
function goal(level: GoalLevel, status: GoalStatus = "open"): GrowthGoal {
  seq += 1;
  return {
    id: `g${seq}`,
    user_id: "u1",
    plan_id: "p1",
    level,
    parent_goal_id: null,
    body: `goal ${seq}`,
    status,
    period_start: null,
    period_end: null,
    ladders_up: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
  };
}

describe("computeBuild", () => {
  it("is an empty lot with no goals", () => {
    const b = computeBuild([]);
    expect(b.overall).toBe(0);
    expect(b.reached).toBe(0);
    expect(b.totalGoals).toBe(0);
    expect(buildPhaseLabel(b.overall)).toBe("Empty lot");
  });

  it("maps the five stages onto the six goal levels (Vision owns two)", () => {
    expect(STAGES).toHaveLength(5);
    const vision = STAGES[0];
    expect(vision.levels).toEqual(["ten_year", "five_year"]);
    // Every goal level is covered exactly once across the five stages.
    const covered = STAGES.flatMap((s) => s.levels).sort();
    expect(covered).toEqual(
      ["daily", "five_year", "monthly", "six_month", "ten_year", "weekly"].sort(),
    );
  });

  it("lifts the build the moment a goal exists, then fills as it completes", () => {
    const drawn = computeBuild([goal("daily")]);
    const done = computeBuild([goal("daily", "done")]);
    // A drawn-but-undone goal contributes the floor; completing it contributes
    // the full stage weight.
    expect(drawn.overall).toBeGreaterThan(0);
    expect(done.overall).toBeGreaterThan(drawn.overall);
  });

  it("ignores dropped goals", () => {
    const b = computeBuild([goal("monthly", "dropped")]);
    expect(b.totalGoals).toBe(0);
    expect(b.overall).toBe(0);
  });

  it("counts a stage as reached once it has any goal, and marks it unlocked next", () => {
    const b = computeBuild([goal("ten_year")]);
    expect(b.reached).toBe(1);
    // vision has goals → blueprint becomes unlocked, rooms does not yet.
    const byKey = Object.fromEntries(b.stages.map((s) => [s.def.key, s]));
    expect(byKey.vision.unlocked).toBe(true);
    expect(byKey.blueprint.unlocked).toBe(true);
    expect(byKey.rooms.unlocked).toBe(false);
  });

  it("keeps the endowed foundation state coherent", () => {
    const b = computeBuild([], { hasPlan: true });
    expect(b.overall).toBe(FOUNDATION_FLOOR);
    // The badge must say Foundation — the same story as the "foundation laid"
    // card. A floor that lands in the "Site survey" band is a contradiction.
    expect(buildPhaseLabel(b.overall)).toBe("Foundation");
    // And it must sit strictly inside the slab's visual build window
    // (0.12–0.30) so the house actually shows poured concrete.
    expect(FOUNDATION_FLOOR).toBeGreaterThan(0.12);
    expect(FOUNDATION_FLOOR).toBeLessThan(0.3);
    // Endowment never reduces earned progress.
    const earned = computeBuild(
      (["ten_year", "five_year", "six_month", "monthly", "weekly", "daily"] as const).map(
        (l) => goal(l, "done"),
      ),
      { hasPlan: true },
    );
    expect(earned.overall).toBeCloseTo(1, 5);
  });

  it("points to the next single move down the cascade", () => {
    // Fresh blueprint, no goals → design the first room.
    expect(nextMove(computeBuild([], { hasPlan: true })).stageKey).toBe("rooms");
    expect(nextMove(computeBuild([], { hasPlan: true })).level).toBe("monthly");

    // Has a monthly → take this week's measurements.
    expect(nextMove(computeBuild([goal("monthly")])).stageKey).toBe(
      "measurements",
    );
    // Has monthly + weekly → lay today's board.
    expect(
      nextMove(computeBuild([goal("monthly"), goal("weekly")])).stageKey,
    ).toBe("build");
    // Has an open daily → complete it (sends to check-in).
    const m = nextMove(
      computeBuild([goal("monthly"), goal("weekly"), goal("daily")]),
    );
    expect(m.kind).toBe("complete");
    // All daily done → encourage the next add.
    const allDone = nextMove(
      computeBuild([
        goal("monthly", "done"),
        goal("weekly", "done"),
        goal("daily", "done"),
      ]),
    );
    expect(allDone.kind).toBe("add");
  });

  it("reaches a fully built house when every stage is complete", () => {
    const all = (["ten_year", "five_year", "six_month", "monthly", "weekly", "daily"] as GoalLevel[]).map(
      (l) => goal(l, "done"),
    );
    const b = computeBuild(all);
    expect(b.overall).toBeCloseTo(1, 5);
    expect(b.reached).toBe(5);
    expect(buildPhaseLabel(b.overall)).toBe("Move-in ready");
  });
});
