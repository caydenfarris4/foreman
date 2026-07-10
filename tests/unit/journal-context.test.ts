import { describe, it, expect } from "vitest";
import { recordedKnowledgeBlock } from "@/lib/journal-context";
import type { JournalEntry, JournalKind } from "@/lib/database.types";

type E = Pick<JournalEntry, "kind" | "body" | "source" | "entry_date">;

function e(kind: JournalKind, body: string, source: string | null = null): E {
  return { kind, body, source, entry_date: "2026-07-01" };
}

describe("recordedKnowledgeBlock", () => {
  it("returns empty when nothing is recorded (coaching unaffected)", () => {
    expect(recordedKnowledgeBlock([])).toBe("");
    // Whitespace-only bodies don't count.
    expect(recordedKnowledgeBlock([e("quote", "   ")])).toBe("");
  });

  it("includes quotes with their attribution", () => {
    const block = recordedKnowledgeBlock([
      e("quote", "Do the hard thing before the easy thing.", "Under Construction"),
    ]);
    expect(block).toContain("Quotes they've kept:");
    expect(block).toContain("Do the hard thing before the easy thing.");
    expect(block).toContain("— Under Construction");
    // The governing line is always present when knowledge exists.
    expect(block).toContain("Knowledge carefully recorded");
    // Guardrail against forced references travels with the block.
    expect(block).toContain("Never force a connection");
  });

  it("separates insights and reflections, and caps counts", () => {
    const entries: E[] = [
      ...Array.from({ length: 10 }, (_, i) => e("quote", `Quote ${i}`)),
      ...Array.from({ length: 8 }, (_, i) => e("insight", `Insight ${i}`)),
      ...Array.from({ length: 6 }, (_, i) => e("reflection", `Reflection ${i}`)),
    ];
    const block = recordedKnowledgeBlock(entries);
    expect(block).toContain("Insights they saved from coaching:");
    expect(block).toContain("Recent reflections:");
    // Caps: 6 quotes, 4 insights, 3 reflections.
    expect(block).toContain("Quote 5");
    expect(block).not.toContain("Quote 6");
    expect(block).toContain("Insight 3");
    expect(block).not.toContain("Insight 4");
    expect(block).toContain("Reflection 2");
    expect(block).not.toContain("Reflection 3");
  });

  it("clips very long entries", () => {
    const block = recordedKnowledgeBlock([e("quote", "x".repeat(1000))]);
    expect(block.length).toBeLessThan(1000);
    expect(block).toContain("…");
  });
});
