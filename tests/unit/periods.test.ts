import { describe, expect, it } from "vitest";
import {
  checkinAnchorLevelFor,
  checkinLevelFor,
  periodDateFor,
} from "@/lib/inspection/periods";

describe("periodDateFor", () => {
  it("daily is the day itself", () => {
    expect(periodDateFor("daily", "2026-06-25")).toBe("2026-06-25");
  });
  it("weekly is the Monday of that week", () => {
    // 2026-06-25 is a Thursday -> Monday 2026-06-22
    expect(periodDateFor("weekly", "2026-06-25")).toBe("2026-06-22");
  });
  it("monthly is the first of the month", () => {
    expect(periodDateFor("monthly", "2026-06-25")).toBe("2026-06-01");
  });
});

describe("level mapping", () => {
  it("a check-in works on its own level", () => {
    expect(checkinLevelFor("daily")).toBe("daily");
    expect(checkinLevelFor("weekly")).toBe("weekly");
    expect(checkinLevelFor("monthly")).toBe("monthly");
  });
  it("and is reviewed against the level above", () => {
    expect(checkinAnchorLevelFor("daily")).toBe("weekly");
    expect(checkinAnchorLevelFor("weekly")).toBe("monthly");
    expect(checkinAnchorLevelFor("monthly")).toBe("six_month");
  });
});
