import { describe, expect, it } from "vitest";
import {
  ALL_QUESTIONS,
  answerAlignment,
  questionByKey,
  selectInspectionQuestions,
} from "@/lib/inspection/questions";
import { PRINCIPLES } from "@/lib/inspection/principles";

describe("question bank", () => {
  it("has unique keys and valid layers", () => {
    const keys = ALL_QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of ALL_QUESTIONS) {
      expect(["foundation", "frame", "finish"]).toContain(q.layer);
    }
  });
  it("covers all eleven principles in the frame layer", () => {
    const covered = new Set(
      ALL_QUESTIONS.filter((q) => q.layer === "frame").map((q) => q.principle),
    );
    for (const p of PRINCIPLES) expect(covered.has(p.key)).toBe(true);
  });
});

describe("selectInspectionQuestions", () => {
  it("includes foundation + finish + weighted full coverage, capped at 25", () => {
    const qs = selectInspectionQuestions(["foundation", "framing", "integrity"], 1);
    expect(qs.length).toBeGreaterThanOrEqual(15);
    expect(qs.length).toBeLessThanOrEqual(25);
    // weighted principles get more than one question each
    const framingCount = qs.filter((q) => q.principle === "framing").length;
    expect(framingCount).toBeGreaterThanOrEqual(2);
    // every unweighted principle still gets at least a light reading
    const integrity = qs.filter((q) => q.principle === "integrity").length;
    expect(integrity).toBeGreaterThanOrEqual(2);
  });
  it("rotates the light unweighted question by cycle", () => {
    const c1 = selectInspectionQuestions(["foundation", "framing"], 1);
    const c2 = selectInspectionQuestions(["foundation", "framing"], 2);
    // mentorship is unweighted here; its single light question may rotate
    const m1 = c1.find((q) => q.principle === "mentorship")?.key;
    const m2 = c2.find((q) => q.principle === "mentorship")?.key;
    expect(m1).toBeDefined();
    expect(m2).toBeDefined();
    expect(m1).not.toBe(m2);
  });
});

describe("answerAlignment", () => {
  it("maps a slider 1..5 to 0..1", () => {
    const q = questionByKey("fnd_settled_identity")!;
    expect(answerAlignment(q, 1)).toBe(0);
    expect(answerAlignment(q, 5)).toBe(1);
    expect(answerAlignment(q, 3)).toBeCloseTo(0.5);
    expect(answerAlignment(q, 9)).toBeNull();
  });
  it("reverse-codes a reverse slider", () => {
    const q = questionByKey("fnd_borrowed_confidence")!; // reverse
    expect(answerAlignment(q, 5)).toBe(0); // "always depends on wins" = misaligned
    expect(answerAlignment(q, 1)).toBe(1);
  });
  it("maps frequency, reverse-coding where flagged", () => {
    const fwd = questionByKey("fin_daily_followthrough")!;
    expect(answerAlignment(fwd, "always")).toBe(1);
    expect(answerAlignment(fwd, "never")).toBe(0);
    const rev = questionByKey("fin_reactive_dropoff")!; // reverse
    expect(answerAlignment(rev, "always")).toBe(0);
    expect(answerAlignment(rev, "bogus")).toBeNull();
  });
  it("uses the scenario option signal", () => {
    const q = questionByKey("fnd_title_identity")!;
    expect(answerAlignment(q, "hear_then_decide")).toBe(1);
    expect(answerAlignment(q, "defend_title")).toBe(0.2);
    expect(answerAlignment(q, "nope")).toBeNull();
  });
});
