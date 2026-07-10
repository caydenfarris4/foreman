// Recorded knowledge → coaching context.
//
// "Knowledge carefully recorded is knowledge available in a time of need."
// The journal is where the user records what's shaping them — quotes kept
// from reading, insights saved from past coaching, reflections. This builds
// the system-prompt block that puts that record in the coach's hands, so the
// coaching can draw on the user's own library of meaning instead of generic
// wisdom. Pure function; the API route feeds it rows and appends the result.
import type { JournalEntry, JournalKind } from "./database.types";

const MAX_ITEM_CHARS = 300;
const MAX_QUOTES = 6;
const MAX_INSIGHTS = 4;
const MAX_REFLECTIONS = 3;

function clip(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > MAX_ITEM_CHARS ? `${t.slice(0, MAX_ITEM_CHARS - 1)}…` : t;
}

type MinimalEntry = Pick<JournalEntry, "kind" | "body" | "source" | "entry_date">;

/**
 * Builds the "recorded knowledge" context block for the coaching system
 * prompt, or "" when there is nothing recorded (the coach then works as
 * before — this feature only ever adds context, never blocks).
 */
export function recordedKnowledgeBlock(entries: MinimalEntry[]): string {
  const take = (kind: JournalKind, n: number) =>
    entries.filter((e) => e.kind === kind && e.body?.trim()).slice(0, n);

  const quotes = take("quote", MAX_QUOTES);
  const insights = take("insight", MAX_INSIGHTS);
  const reflections = take("reflection", MAX_REFLECTIONS);
  if (quotes.length + insights.length + reflections.length === 0) return "";

  const lines: string[] = [
    "RECORDED KNOWLEDGE — the user's own journal. \"Knowledge carefully recorded is knowledge available in a time of need.\" These are quotes they chose to keep from their reading, insights they saved from past coaching, and recent reflections. When one genuinely serves today's situation, draw on it — quote their own record back to them and connect it. Their own recorded words land harder than new advice. Never force a connection that isn't there.",
  ];

  if (quotes.length) {
    lines.push("", "Quotes they've kept:");
    for (const q of quotes) {
      lines.push(`- "${clip(q.body)}"${q.source ? ` — ${clip(q.source)}` : ""}`);
    }
  }
  if (insights.length) {
    lines.push("", "Insights they saved from coaching:");
    for (const i of insights) {
      lines.push(`- ${clip(i.body)} (${i.entry_date})`);
    }
  }
  if (reflections.length) {
    lines.push("", "Recent reflections:");
    for (const r of reflections) {
      lines.push(`- ${clip(r.body)} (${r.entry_date})`);
    }
  }

  return lines.join("\n");
}
