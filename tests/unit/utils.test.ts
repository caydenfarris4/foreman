import { describe, expect, it } from "vitest";
import { weekStartFor } from "@/lib/utils";

describe("weekStartFor (Monday-anchored ISO week)", () => {
  it("returns the Monday on or before the date", () => {
    // 2026-06-25 is a Thursday -> Monday 2026-06-22
    expect(weekStartFor("2026-06-25")).toBe("2026-06-22");
  });
  it("a Monday maps to itself", () => {
    expect(weekStartFor("2026-06-22")).toBe("2026-06-22");
  });
  it("a Sunday maps back to the prior Monday", () => {
    // 2026-06-21 is a Sunday -> 2026-06-15
    expect(weekStartFor("2026-06-21")).toBe("2026-06-15");
  });
  it("handles month boundaries", () => {
    // 2026-03-01 is a Sunday -> Monday 2026-02-23
    expect(weekStartFor("2026-03-01")).toBe("2026-02-23");
  });
});
