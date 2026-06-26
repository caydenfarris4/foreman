// Wiring the inspection into the rest of the app (BUILD_SPEC §5.3): feed the
// latest inspection into coaching context, and detect the "stuck for a year"
// signal that warrants a human coaching session. Pure + unit-tested.

import { principleByKey } from "./principles";
import type { PrincipleKey } from "@/lib/database.types";
import type { TrajectoryRead } from "./scoring";

/**
 * A short context line injected into the daily-coaching system prompt so the
 * coaching is grounded in the user's real inspection data, not generic advice.
 * Returns null when there's nothing meaningful to add.
 */
export function inspectionContextLine(
  trajectory: TrajectoryRead | null,
): string | null {
  if (!trajectory) return null;
  const stuck = (trajectory.stuck ?? []).map(
    (p) => principleByKey(p as PrincipleKey).name,
  );
  const parts: string[] = [];
  if (trajectory.overall && trajectory.overall !== "baseline") {
    parts.push(`their overall trajectory is ${trajectory.overall}`);
  }
  if (stuck.length) {
    parts.push(`these principles are stuck or declining: ${stuck.join(", ")}`);
  }
  if (parts.length === 0) return null;
  return `RECENT GROWTH INSPECTION: ${parts.join("; ")}. Let this quietly inform today's coaching where it helps, without naming the inspection unless they raise it.`;
}

/**
 * Principles stuck in BOTH the latest and the prior inspection — the "stuck for
 * a year" signal. This is exactly when a person needs a real person, so it
 * surfaces a prompt to book a coaching session.
 */
export function stuckAcrossTwo(
  latest: TrajectoryRead | null,
  prior: TrajectoryRead | null,
): PrincipleKey[] {
  if (!latest || !prior) return [];
  const priorSet = new Set(prior.stuck ?? []);
  return (latest.stuck ?? []).filter((p) =>
    priorSet.has(p),
  ) as PrincipleKey[];
}
