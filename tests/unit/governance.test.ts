import { describe, expect, it } from "vitest";
import {
  passesGovernance,
  validateReportProse,
} from "@/lib/inspection/governance";

const CLEAN =
  "You held steady on patience this cycle. Your weekly check-ins show the gap narrowing. Keep pointing the daily work at the six-month milestone.";

describe("validateReportProse", () => {
  it("passes clean governed prose", () => {
    const res = validateReportProse(CLEAN);
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect(passesGovernance(CLEAN)).toBe(true);
  });

  it("flags an em dash", () => {
    const res = validateReportProse("You are doing well — keep going.");
    expect(res.ok).toBe(false);
    expect(res.violations.map((v) => v.rule)).toContain("em_dash");
  });

  it("flags bullet points", () => {
    expect(passesGovernance("Wins:\n- did a thing\n- did another")).toBe(false);
    expect(passesGovernance("1. first\n2. second")).toBe(false);
  });

  it("flags emoji", () => {
    expect(passesGovernance("Great work 🚀")).toBe(false);
  });

  it("flags hashtags", () => {
    expect(passesGovernance("Keep building #growth")).toBe(false);
  });

  it("flags state-score language (a ceiling)", () => {
    expect(passesGovernance("You scored 72/100 this cycle.")).toBe(false);
    expect(passesGovernance("You are an 8 out of 10.")).toBe(false);
    expect(passesGovernance("Your score is 84.")).toBe(false);
  });

  it("reports every violation at once", () => {
    const res = validateReportProse("You're a 90/100 🚀 — nice\n- bullet #tag");
    const rules = res.violations.map((v) => v.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        "em_dash",
        "bullet_points",
        "emoji",
        "hashtag_stack",
        "state_score",
      ]),
    );
  });
});
