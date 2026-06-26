import { describe, expect, it } from "vitest";
import { promptForDay, promptCountForPhase } from "@/lib/prompts/daily";
import { reflectionForDay, REFLECTION_PROMPT_COUNT } from "@/lib/prompts/reflection";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("promptForDay", () => {
  it("is deterministic for the same user + date + phase", () => {
    const a = promptForDay("foundation", "2026-06-25", USER);
    const b = promptForDay("foundation", "2026-06-25", USER);
    expect(a).toBe(b);
  });
  it("always returns a prompt from the phase list", () => {
    for (const phase of ["foundation", "framing", "finishing"] as const) {
      const out = promptForDay(phase, "2026-06-25", USER);
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
      expect(promptCountForPhase(phase)).toBeGreaterThan(0);
    }
  });
  it("varies across dates (not stuck on one prompt)", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      seen.add(promptForDay("framing", `2026-06-${String(d).padStart(2, "0")}`, USER));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
  it("salts by user id", () => {
    // Over a window, two users should not be perfectly identical.
    let differ = false;
    for (let d = 1; d <= 28 && !differ; d++) {
      const day = `2026-06-${String(d).padStart(2, "0")}`;
      if (promptForDay("foundation", day, USER) !== promptForDay("foundation", day, OTHER)) {
        differ = true;
      }
    }
    expect(differ).toBe(true);
  });
});

describe("reflectionForDay", () => {
  it("is deterministic and in-range", () => {
    const a = reflectionForDay("2026-06-25", USER);
    expect(a).toBe(reflectionForDay("2026-06-25", USER));
    expect(typeof a).toBe("string");
    expect(REFLECTION_PROMPT_COUNT).toBeGreaterThan(10);
  });
});
