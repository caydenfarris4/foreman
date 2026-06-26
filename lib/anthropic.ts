import Anthropic from "@anthropic-ai/sdk";
import {
  isInspectionLayer,
  isPrincipleKey,
} from "@/lib/inspection/principles";
import type { InspectionLayer, PrincipleKey } from "@/lib/database.types";

export const CLAUDE_MODEL = "claude-sonnet-4-6";
export const CLAUDE_TIMEOUT_MS = 30_000;

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey, timeout: CLAUDE_TIMEOUT_MS });
  }
  return client;
}

export const COACHING_FALLBACK =
  "We couldn't reach the coaching model just now — that's on us, not you. Your check-in is saved. Open it again in a few minutes and we'll run it through. In the meantime, the question above is still worth sitting with.";

interface CoachingJson {
  phase: "foundation" | "framing" | "finishing";
  tags: string[];
  coaching: string;
  title: string;
}

export function parseCoachingJson(raw: string): CoachingJson | null {
  // Models sometimes wrap JSON in ```json fences or prose. Be permissive.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.coaching === "string" &&
      typeof parsed.title === "string" &&
      (parsed.phase === "foundation" ||
        parsed.phase === "framing" ||
        parsed.phase === "finishing") &&
      Array.isArray(parsed.tags) &&
      parsed.tags.every((t: unknown) => typeof t === "string")
    ) {
      return parsed as CoachingJson;
    }
  } catch {
    // fall through
  }
  return null;
}

interface RetroJson {
  synthesis: string;
  framework_focus: "foundation" | "framing" | "finishing";
}

export function parseRetroJson(raw: string): RetroJson | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.synthesis === "string" &&
      (parsed.framework_focus === "foundation" ||
        parsed.framework_focus === "framing" ||
        parsed.framework_focus === "finishing")
    ) {
      return parsed as RetroJson;
    }
  } catch {
    // fall through
  }
  return null;
}

interface MonthlyJson {
  summary: string;
  framework_focus: "foundation" | "framing" | "finishing";
}

export function parseMonthlyJson(raw: string): MonthlyJson | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.summary === "string" &&
      (parsed.framework_focus === "foundation" ||
        parsed.framework_focus === "framing" ||
        parsed.framework_focus === "finishing")
    ) {
      return parsed as MonthlyJson;
    }
  } catch {
    // fall through
  }
  return null;
}

export interface MappingItem {
  principle: PrincipleKey;
  layer: InspectionLayer;
  rationale: string;
}

// Parse the plan→principle mapping JSON. Drops any item that names a principle
// or layer outside the fixed vocabulary, so the model can't invent principles.
export function parseMappingJson(raw: string): MappingItem[] | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray(parsed.mappings)
    ) {
      return null;
    }
    const items: MappingItem[] = [];
    const seen = new Set<string>();
    for (const m of parsed.mappings) {
      if (
        m &&
        typeof m === "object" &&
        isPrincipleKey(m.principle) &&
        isInspectionLayer(m.layer) &&
        !seen.has(m.principle)
      ) {
        seen.add(m.principle);
        items.push({
          principle: m.principle,
          layer: m.layer,
          rationale:
            typeof m.rationale === "string" ? m.rationale.trim() : "",
        });
      }
    }
    return items;
  } catch {
    return null;
  }
}

export interface InspectionReportJson {
  report: string;
  hard_note: string | null;
}

// Parse the inspection report JSON: { report, hard_note }. Returns null if the
// report text is missing so the caller can regenerate.
export function parseInspectionReportJson(
  raw: string,
): InspectionReportJson | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.report === "string" &&
      parsed.report.trim().length > 0
    ) {
      const hard =
        typeof parsed.hard_note === "string" && parsed.hard_note.trim().length
          ? parsed.hard_note.trim()
          : null;
      return { report: parsed.report.trim(), hard_note: hard };
    }
  } catch {
    // fall through
  }
  return null;
}
