import { describe, expect, it } from "vitest";
import {
  inspectionContextLine,
  stuckAcrossTwo,
} from "@/lib/inspection/context";
import type { TrajectoryRead } from "@/lib/inspection/scoring";

describe("inspectionContextLine", () => {
  it("is null with no trajectory", () => {
    expect(inspectionContextLine(null)).toBeNull();
  });
  it("is null for a clean baseline (nothing to add)", () => {
    const t: TrajectoryRead = { overall: "baseline", gap: 0.3, stuck: [] };
    expect(inspectionContextLine(t)).toBeNull();
  });
  it("names direction and stuck principles", () => {
    const t: TrajectoryRead = {
      overall: "widening",
      gap: 0.6,
      stuck: ["integrity", "patience"],
    };
    const line = inspectionContextLine(t)!;
    expect(line).toContain("widening");
    expect(line).toContain("Integrity");
    expect(line).toContain("Patience");
    expect(line).toContain("GROWTH INSPECTION");
  });
});

describe("stuckAcrossTwo", () => {
  const mk = (stuck: string[]): TrajectoryRead => ({
    overall: "steady",
    gap: 0.5,
    stuck: stuck as TrajectoryRead["stuck"],
  });

  it("returns only principles stuck in both", () => {
    expect(
      stuckAcrossTwo(mk(["integrity", "culture"]), mk(["integrity", "belief"])),
    ).toEqual(["integrity"]);
  });
  it("is empty when there is no prior", () => {
    expect(stuckAcrossTwo(mk(["integrity"]), null)).toEqual([]);
  });
  it("is empty when nothing overlaps", () => {
    expect(stuckAcrossTwo(mk(["culture"]), mk(["belief"]))).toEqual([]);
  });
});
