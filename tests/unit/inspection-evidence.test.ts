import { describe, expect, it } from "vitest";
import {
  buildGrowthEvidence,
  daysUntilInspection,
  INSPECTION_INTERVAL_DAYS,
  inspectionDueAt,
  isInspectionDue,
  type GrowthEvidenceInput,
} from "@/lib/inspection/evidence";

const DAY = 86400_000;

function input(overrides: Partial<GrowthEvidenceInput> = {}): GrowthEvidenceInput {
  return {
    windowStartISO: "2026-01-01T00:00:00.000Z",
    checkinCount: 0,
    situationTitles: [],
    retroCount: 0,
    latestRetroFocus: null,
    boardsCompleted: 0,
    weeklyGoalsCompleted: 0,
    monthlyGoalsCompleted: 0,
    journalReflections: 0,
    journalQuotes: [],
    journalInsights: 0,
    habitChecks: 0,
    ...overrides,
  };
}

describe("buildGrowthEvidence", () => {
  it("returns an empty prompt block and no stats when nothing was logged", () => {
    const ev = buildGrowthEvidence(input());
    expect(ev.promptBlock).toBe("");
    expect(ev.stats).toEqual([]);
  });

  it("only surfaces stats with a nonzero value", () => {
    const ev = buildGrowthEvidence(
      input({ checkinCount: 12, habitChecks: 40 }),
    );
    expect(ev.stats.map((s) => s.label)).toEqual([
      "Check-ins written",
      "Habits checked",
    ]);
    expect(ev.stats.find((s) => s.label === "Check-ins written")?.value).toBe(12);
  });

  it("rolls all journal kinds into one journal stat", () => {
    const ev = buildGrowthEvidence(
      input({
        journalReflections: 3,
        journalQuotes: [{ body: "Knowledge carefully recorded", source: null }],
        journalInsights: 2,
      }),
    );
    expect(ev.stats.find((s) => s.label === "Journal entries")?.value).toBe(6);
  });

  it("writes the window date, counts, titles, and kept quotes into the prompt block", () => {
    const ev = buildGrowthEvidence(
      input({
        checkinCount: 34,
        boardsCompleted: 20,
        weeklyGoalsCompleted: 6,
        retroCount: 9,
        latestRetroFocus: "framing",
        situationTitles: ["Hard talk with a supervisor", "Delegating the close"],
        journalQuotes: [
          { body: "Knowledge carefully recorded is knowledge available in a time of need.", source: "Under Construction" },
        ],
      }),
    );
    expect(ev.promptBlock).toContain("GROWTH RECORD since 2026-01-01");
    expect(ev.promptBlock).toContain("coached: 34");
    expect(ev.promptBlock).toContain("boards completed: 20");
    expect(ev.promptBlock).toContain("latest focus: framing");
    expect(ev.promptBlock).toContain("Hard talk with a supervisor");
    expect(ev.promptBlock).toContain("Under Construction");
  });

  it("clips long quotes and caps titles at four", () => {
    const ev = buildGrowthEvidence(
      input({
        checkinCount: 1,
        situationTitles: ["a", "b", "c", "d", "e", "f"],
        journalQuotes: [{ body: "x".repeat(500), source: null }],
      }),
    );
    expect(ev.promptBlock).not.toContain('"e"');
    expect(ev.promptBlock).not.toContain("x".repeat(200));
  });
});

describe("firm six-month cycle", () => {
  const sent = "2026-01-01T00:00:00.000Z";
  const sentMs = new Date(sent).getTime();

  it("a user with no sent report is due immediately (baseline)", () => {
    expect(isInspectionDue(null)).toBe(true);
  });

  it("locks until 182 days after the last sent report", () => {
    expect(isInspectionDue(sent, sentMs + DAY)).toBe(false);
    expect(
      isInspectionDue(sent, sentMs + (INSPECTION_INTERVAL_DAYS - 1) * DAY),
    ).toBe(false);
    expect(
      isInspectionDue(sent, sentMs + INSPECTION_INTERVAL_DAYS * DAY),
    ).toBe(true);
  });

  it("computes the unlock date and the days remaining", () => {
    expect(inspectionDueAt(sent)).toBe("2026-07-02T00:00:00.000Z");
    expect(daysUntilInspection(sent, sentMs + DAY)).toBe(
      INSPECTION_INTERVAL_DAYS - 1,
    );
    expect(
      daysUntilInspection(sent, sentMs + INSPECTION_INTERVAL_DAYS * DAY),
    ).toBe(0);
  });
});
