// The governance router (BUILD_SPEC §6; GOVERNANCE Part 6.2).
//
// Decides whether a generated inspection report can auto-clear (sent without
// review) or must route to Cayden's queue. A report routes when ANY trigger
// fires. Pure and unit-tested; the route handler persists the decision.

import type { PrincipleKey } from "@/lib/database.types";
import type { Confidence, Direction, LayerReads, TrajectoryRead } from "./scoring";

export type FlagReason =
  | "hard_note"
  | "foundation_drop"
  | "dimension_stuck_two_cycles"
  | "behavior_dropoff"
  | "low_confidence";

export interface RouterInput {
  layerReads: LayerReads;
  trajectory: TrajectoryRead;
  prior: LayerReads | null;
  completionRate: number | null;
  hasHardNote: boolean;
  isBaseline: boolean;
}

export interface RouterDecision {
  routed: boolean;
  reasons: FlagReason[];
}

const BEHAVIOR_FLOOR = 0.4; // sustained completion below this = fallen off

function isLow(c: Confidence): boolean {
  return c === "low";
}

export function routeInspection(input: RouterInput): RouterDecision {
  const { layerReads, trajectory, prior, completionRate, hasHardNote } = input;
  const reasons: FlagReason[] = [];

  // 5. A hard note is routed by default until trust is established.
  if (hasHardNote) reasons.push("hard_note");

  // 2. The Foundation layer shows a real drop (identity / impostor signal).
  if (layerReads.foundation.direction === "widening") {
    reasons.push("foundation_drop");
  }

  // 1. A weighted dimension stuck or declining across two consecutive cycles.
  if (prior) {
    for (const principle of trajectory.stuck) {
      const priorDir: Direction | undefined =
        prior.byPrinciple?.[principle as PrincipleKey]?.direction;
      if (priorDir === "widening" || priorDir === "steady") {
        reasons.push("dimension_stuck_two_cycles");
        break;
      }
    }
  }

  // 3. Daily behavior has fallen off for the defined stretch.
  if (
    (completionRate != null && completionRate < BEHAVIOR_FLOOR) ||
    layerReads.finish.direction === "widening"
  ) {
    reasons.push("behavior_dropoff");
  }

  // 4. The AI's own confidence on the load-bearing layers is low.
  if (isLow(layerReads.foundation.confidence) || isLow(layerReads.frame.confidence)) {
    reasons.push("low_confidence");
  }

  // Dedupe.
  const unique = [...new Set(reasons)];
  return { routed: unique.length > 0, reasons: unique };
}

export const FLAG_REASON_LABEL: Record<FlagReason, string> = {
  hard_note: "Contains a hard note",
  foundation_drop: "Foundation (identity) dropped",
  dimension_stuck_two_cycles: "A focus principle is stuck two cycles running",
  behavior_dropoff: "Daily behavior has fallen off",
  low_confidence: "Low confidence on a load-bearing read",
};
