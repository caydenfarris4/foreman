// The scoring engine (BUILD_SPEC §2.2, §5; GOVERNANCE Part 5).
//
// Computes a TRAJECTORY, never a state score. For each layer and weighted
// principle it produces an internal alignment in [0,1], a gap (1-alignment),
// a direction vs the prior inspection (narrowing / steady / widening /
// baseline), and a confidence based on how much data supports the read.
//
// Governance constraints honored here:
//   - Behavioral anchor: frequency answers and cascade completion are weighted
//     more heavily than self-assessment sliders.
//   - Slow layers move slowly: Foundation uses a wider "steady" band so a small
//     shift is reported as steady, not manufactured movement.
//   - Confidence is tracked; low confidence is a routing trigger, not papered
//     over.
// The raw numbers are internal (for the router + report prompt). They are never
// shown to the user as a score.

import type { InspectionLayer, PrincipleKey } from "@/lib/database.types";
import { ALL_QUESTIONS, answerAlignment, type InstrumentQuestion } from "./questions";

export type Direction = "narrowing" | "steady" | "widening" | "baseline";
export type Confidence = "low" | "medium" | "high";

export interface DimensionRead {
  alignment: number;
  gap: number;
  direction: Direction;
  confidence: Confidence;
  dataPoints: number;
}

export interface LayerReads {
  foundation: DimensionRead;
  frame: DimensionRead;
  finish: DimensionRead;
  byPrinciple: Partial<Record<PrincipleKey, DimensionRead>>;
}

export interface TrajectoryRead {
  overall: Direction;
  gap: number;
  stuck: PrincipleKey[];
}

export interface ScoreInput {
  answers: Record<string, unknown>;
  weighted: readonly PrincipleKey[];
  completionRate: number | null; // 0..1 from cascade check-ins
  prior: LayerReads | null;
}

function typeWeight(q: InstrumentQuestion): number {
  if (q.type === "frequency") return 1.5; // behavioral anchor
  if (q.type === "scenario") return 1.25;
  return 1; // slider
}

function weightedMean(
  entries: { value: number; weight: number }[],
): number | null {
  if (entries.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const e of entries) {
    num += e.value * e.weight;
    den += e.weight;
  }
  return den === 0 ? null : num / den;
}

function confidenceFor(dataPoints: number): Confidence {
  if (dataPoints <= 1) return "low";
  if (dataPoints <= 3) return "medium";
  return "high";
}

function directionFor(
  alignment: number,
  priorAlignment: number | null,
  band: number,
): Direction {
  if (priorAlignment == null) return "baseline";
  const delta = alignment - priorAlignment;
  if (delta > band) return "narrowing"; // gap to the stated path is closing
  if (delta < -band) return "widening";
  return "steady";
}

function read(
  alignment: number | null,
  dataPoints: number,
  priorAlignment: number | null,
  band: number,
): DimensionRead {
  const a = alignment ?? 0;
  return {
    alignment: a,
    gap: 1 - a,
    direction: alignment == null ? "baseline" : directionFor(a, priorAlignment, band),
    confidence: alignment == null ? "low" : confidenceFor(dataPoints),
    dataPoints,
  };
}

const FOUNDATION_BAND = 0.1; // slow layer: wider steady band
const DEFAULT_BAND = 0.05;

export function scoreInspection(input: ScoreInput): {
  layerReads: LayerReads;
  trajectory: TrajectoryRead;
} {
  const { answers, weighted, completionRate, prior } = input;
  const weightedSet = new Set(weighted);

  // Bucket answered questions.
  const byLayer: Record<InspectionLayer, { value: number; weight: number }[]> = {
    foundation: [],
    frame: [],
    finish: [],
  };
  const byPrincipleEntries = new Map<
    PrincipleKey,
    { value: number; weight: number }[]
  >();

  for (const q of ALL_QUESTIONS) {
    if (!(q.key in answers)) continue;
    const a = answerAlignment(q, answers[q.key]);
    if (a == null) continue;
    const entry = { value: a, weight: typeWeight(q) };
    byLayer[q.layer].push(entry);
    if (q.layer === "frame" && q.principle) {
      const arr = byPrincipleEntries.get(q.principle) ?? [];
      arr.push(entry);
      byPrincipleEntries.set(q.principle, arr);
    }
  }

  // Per-principle reads.
  const byPrinciple: Partial<Record<PrincipleKey, DimensionRead>> = {};
  for (const [principle, entries] of byPrincipleEntries) {
    const priorRead = prior?.byPrinciple?.[principle] ?? null;
    byPrinciple[principle] = read(
      weightedMean(entries),
      entries.length,
      priorRead ? priorRead.alignment : null,
      DEFAULT_BAND,
    );
  }

  // Foundation layer.
  const foundation = read(
    weightedMean(byLayer.foundation),
    byLayer.foundation.length,
    prior ? prior.foundation.alignment : null,
    FOUNDATION_BAND,
  );

  // Frame layer: emphasize the weighted principles (count them double).
  const frameEntries: { value: number; weight: number }[] = [];
  for (const [principle, dim] of Object.entries(byPrinciple) as [
    PrincipleKey,
    DimensionRead,
  ][]) {
    frameEntries.push({
      value: dim.alignment,
      weight: weightedSet.has(principle) ? 2 : 1,
    });
  }
  const frame = read(
    weightedMean(frameEntries),
    byLayer.frame.length,
    prior ? prior.frame.alignment : null,
    DEFAULT_BAND,
  );

  // Finish layer: blend the behavioral questions with cascade completion. The
  // completion rate is the harder signal, so it gets the larger share.
  const finishQ = weightedMean(byLayer.finish);
  let finishAlignment: number | null;
  let finishPoints = byLayer.finish.length;
  if (completionRate != null && finishQ != null) {
    finishAlignment = completionRate * 0.6 + finishQ * 0.4;
    finishPoints += 1;
  } else if (completionRate != null) {
    finishAlignment = completionRate;
    finishPoints += 1;
  } else {
    finishAlignment = finishQ;
  }
  const finish = read(
    finishAlignment,
    finishPoints,
    prior ? prior.finish.alignment : null,
    DEFAULT_BAND,
  );

  // Stuck = a weighted principle that is widening, or steady with a wide gap.
  const stuck: PrincipleKey[] = [];
  for (const principle of weighted) {
    const dim = byPrinciple[principle];
    if (!dim) continue;
    if (
      dim.direction === "widening" ||
      (dim.direction === "steady" && dim.gap > 0.5)
    ) {
      stuck.push(principle);
    }
  }

  // Overall trajectory: aggregate the three layer directions.
  const layerReads: LayerReads = { foundation, frame, finish, byPrinciple };
  const overall = aggregateDirection([foundation, frame, finish]);
  const aggGap =
    (foundation.gap + frame.gap + finish.gap) / 3;

  return {
    layerReads,
    trajectory: { overall, gap: aggGap, stuck },
  };
}

function aggregateDirection(reads: DimensionRead[]): Direction {
  const live = reads.filter((r) => r.direction !== "baseline");
  if (live.length === 0) return "baseline";
  const narrowing = live.filter((r) => r.direction === "narrowing").length;
  const widening = live.filter((r) => r.direction === "widening").length;
  if (narrowing > widening) return "narrowing";
  if (widening > narrowing) return "widening";
  return "steady";
}

/** Average completion across cascade check-in goal rows (the behavioral data). */
export function completionRateFrom(
  rows: { completed: boolean }[],
): number | null {
  if (rows.length === 0) return null;
  return rows.filter((r) => r.completed).length / rows.length;
}
