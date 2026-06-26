import { describe, expect, it } from "vitest";
import {
  INSPECTION_LAYERS,
  isInspectionLayer,
  isPrincipleKey,
  layerByKey,
  PRINCIPLES,
  principleByKey,
  validateWeightedSelection,
} from "@/lib/inspection/principles";

describe("the fixed vocabulary", () => {
  it("has exactly eleven principles in construction order", () => {
    expect(PRINCIPLES).toHaveLength(11);
    expect(PRINCIPLES.map((p) => p.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });
  it("has three layers", () => {
    expect(INSPECTION_LAYERS.map((l) => l.key)).toEqual([
      "foundation",
      "frame",
      "finish",
    ]);
  });
  it("keys are unique", () => {
    const keys = PRINCIPLES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("type guards (anti-injection for AI output)", () => {
  it("isPrincipleKey only accepts the eleven", () => {
    expect(isPrincipleKey("foundation")).toBe(true);
    expect(isPrincipleKey("discernment")).toBe(true);
    expect(isPrincipleKey("courage")).toBe(false);
    expect(isPrincipleKey("__proto__")).toBe(false);
    expect(isPrincipleKey(null)).toBe(false);
  });
  it("isInspectionLayer only accepts the three", () => {
    expect(isInspectionLayer("frame")).toBe(true);
    expect(isInspectionLayer("finishing")).toBe(false);
    expect(isInspectionLayer(42)).toBe(false);
  });
});

describe("validateWeightedSelection", () => {
  it("accepts 2 to 4 valid principles and returns them in canonical order", () => {
    const res = validateWeightedSelection(["integrity", "foundation"]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.keys).toEqual(["foundation", "integrity"]);
  });
  it("dedupes", () => {
    const res = validateWeightedSelection(["foundation", "foundation", "framing"]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.keys).toEqual(["foundation", "framing"]);
  });
  it("rejects fewer than 2", () => {
    expect(validateWeightedSelection(["foundation"]).ok).toBe(false);
  });
  it("rejects more than 4", () => {
    expect(
      validateWeightedSelection([
        "foundation",
        "framing",
        "mentorship",
        "reconciliation",
        "belief",
      ]).ok,
    ).toBe(false);
  });
  it("rejects an unknown principle", () => {
    const res = validateWeightedSelection(["foundation", "leadership"]);
    expect(res.ok).toBe(false);
  });
});

describe("lookups", () => {
  it("principleByKey / layerByKey resolve", () => {
    expect(principleByKey("discernment").name).toBe("Discernment");
    expect(layerByKey("finish").name).toBe("Finish work");
  });
});
