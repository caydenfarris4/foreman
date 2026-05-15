import Anthropic from "@anthropic-ai/sdk";

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
