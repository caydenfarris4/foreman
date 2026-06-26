import { describe, expect, it } from "vitest";
import {
  completionRateFrom,
  scoreInspection,
  type LayerReads,
} from "@/lib/inspection/scoring";
import { routeInspection } from "@/lib/inspection/router";

const WEIGHTED = ["foundation", "framing"] as const;

// High-alignment answers for the relevant questions.
const STRONG_ANSWERS: Record<string, unknown> = {
  fnd_settled_identity: 5,
  fnd_borrowed_confidence: 1, // reverse -> aligned
  fnd_pressure_steadiness: "never", // reverse -> aligned
  fnd_title_identity: "hear_then_decide",
  fin_daily_followthrough: "always",
  fin_small_things: "often",
  fin_reactive_dropoff: "never",
  p_foundation_account: 5,
  p_foundation_carry: "never",
  p_framing_systems: 5,
  p_framing_sharpen: "always",
};

describe("scoreInspection", () => {
  it("produces a baseline read with no direction on the first inspection", () => {
    const { layerReads, trajectory } = scoreInspection({
      answers: STRONG_ANSWERS,
      weighted: [...WEIGHTED],
      completionRate: 0.8,
      prior: null,
    });
    expect(layerReads.foundation.direction).toBe("baseline");
    expect(trajectory.overall).toBe("baseline");
    expect(layerReads.foundation.alignment).toBeGreaterThan(0.7);
    // never a state score leaks; we only assert internal gap = 1 - alignment
    expect(layerReads.frame.gap).toBeCloseTo(1 - layerReads.frame.alignment);
  });

  it("reports narrowing when alignment improves vs prior", () => {
    const prior: LayerReads = {
      foundation: { alignment: 0.3, gap: 0.7, direction: "baseline", confidence: "high", dataPoints: 4 },
      frame: { alignment: 0.3, gap: 0.7, direction: "baseline", confidence: "high", dataPoints: 4 },
      finish: { alignment: 0.3, gap: 0.7, direction: "baseline", confidence: "high", dataPoints: 4 },
      byPrinciple: {},
    };
    const { layerReads } = scoreInspection({
      answers: STRONG_ANSWERS,
      weighted: [...WEIGHTED],
      completionRate: 0.9,
      prior,
    });
    expect(layerReads.foundation.direction).toBe("narrowing");
    expect(layerReads.finish.direction).toBe("narrowing");
  });

  it("low data -> low confidence", () => {
    const { layerReads } = scoreInspection({
      answers: { fnd_settled_identity: 4 },
      weighted: [...WEIGHTED],
      completionRate: null,
      prior: null,
    });
    expect(layerReads.foundation.confidence).toBe("low");
  });
});

describe("completionRateFrom", () => {
  it("is null with no rows and a fraction otherwise", () => {
    expect(completionRateFrom([])).toBeNull();
    expect(
      completionRateFrom([{ completed: true }, { completed: false }]),
    ).toBe(0.5);
  });
});

describe("routeInspection", () => {
  const steady: LayerReads = {
    foundation: { alignment: 0.6, gap: 0.4, direction: "steady", confidence: "high", dataPoints: 4 },
    frame: { alignment: 0.6, gap: 0.4, direction: "steady", confidence: "high", dataPoints: 6 },
    finish: { alignment: 0.6, gap: 0.4, direction: "steady", confidence: "high", dataPoints: 4 },
    byPrinciple: {},
  };

  it("auto-clears a steady, confident, no-hard-note report", () => {
    const d = routeInspection({
      layerReads: steady,
      trajectory: { overall: "steady", gap: 0.4, stuck: [] },
      prior: steady,
      completionRate: 0.7,
      hasHardNote: false,
      isBaseline: false,
    });
    expect(d.routed).toBe(false);
    expect(d.reasons).toHaveLength(0);
  });

  it("routes a hard note by default", () => {
    const d = routeInspection({
      layerReads: steady,
      trajectory: { overall: "steady", gap: 0.4, stuck: [] },
      prior: steady,
      completionRate: 0.7,
      hasHardNote: true,
      isBaseline: false,
    });
    expect(d.routed).toBe(true);
    expect(d.reasons).toContain("hard_note");
  });

  it("routes a foundation drop and a behavior drop-off", () => {
    const dropped: LayerReads = {
      ...steady,
      foundation: { ...steady.foundation, direction: "widening" },
    };
    const d = routeInspection({
      layerReads: dropped,
      trajectory: { overall: "widening", gap: 0.6, stuck: [] },
      prior: steady,
      completionRate: 0.2,
      hasHardNote: false,
      isBaseline: false,
    });
    expect(d.routed).toBe(true);
    expect(d.reasons).toContain("foundation_drop");
    expect(d.reasons).toContain("behavior_dropoff");
  });

  it("routes low confidence on a load-bearing layer", () => {
    const lowConf: LayerReads = {
      ...steady,
      frame: { ...steady.frame, confidence: "low" },
    };
    const d = routeInspection({
      layerReads: lowConf,
      trajectory: { overall: "steady", gap: 0.4, stuck: [] },
      prior: null,
      completionRate: 0.7,
      hasHardNote: false,
      isBaseline: true,
    });
    expect(d.routed).toBe(true);
    expect(d.reasons).toContain("low_confidence");
  });
});
