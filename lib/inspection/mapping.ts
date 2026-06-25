// Growth Inspection — plan-to-principle mapping (BUILD_SPEC §3.1 step 4,
// GOVERNANCE_FRAMEWORK Part 8).
//
// The AI reads a user's free-text goal cascade (ten / five year + six-month
// milestone) and maps it onto the FIXED vocabulary of the eleven principles
// and three layers. It returns suggestions the user then confirms or corrects.
// Per Part 8 the AI may NOT invent or rename principles, must not force a plan
// to touch all eleven, and the user always has final say.
//
// This module owns the prompt, the parse, governance validation of the
// rationale prose, and a deterministic fallback for when the model is
// unreachable or returns nothing usable.

import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { validateReportProse } from "./governance";
import {
  INSPECTION_LAYERS,
  PRINCIPLES,
  isInspectionLayer,
  isPrincipleKey,
  principleByKey,
  type InspectionLayer,
  type PrincipleKey,
} from "./principles";

export interface PlanInput {
  tenYear: string;
  fiveYear?: string | null;
  sixMonth?: string | null;
}

export interface MappingSuggestion {
  principle: PrincipleKey;
  layer: InspectionLayer;
  /** Short prose, governance-clean, explaining why the plan touches this. */
  rationale: string;
}

export interface MappingResult {
  suggestions: MappingSuggestion[];
  /** "ai" when the model produced it; "fallback" when we synthesized it. */
  source: "ai" | "fallback";
}

// Each principle's natural home layer, used by the deterministic fallback and
// when the model omits/garbles a layer. Foundation layer = identity; Frame =
// the working principles; Finish = outward behavior (BUILD_SPEC §2.3).
const DEFAULT_PRINCIPLE_LAYER: Record<PrincipleKey, InspectionLayer> = {
  foundation: "foundation",
  belief: "foundation",
  reconciliation: "foundation",
  patience: "foundation",
  framing: "frame",
  integrity: "frame",
  refinement: "frame",
  discernment: "frame",
  mentorship: "finish",
  culture: "finish",
  pressure: "finish",
};

const MAX_RATIONALE = 280;
const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 6;

function principleVocabulary(): string {
  return PRINCIPLES.map(
    (p) => `- ${p.key} (${p.name}): ${p.gloss}`,
  ).join("\n");
}

function layerVocabulary(): string {
  return INSPECTION_LAYERS.map((l) => `- ${l.key} (${l.name}): ${l.gloss}`).join(
    "\n",
  );
}

export const MAPPING_SYSTEM_PROMPT = `You are the mapping engine for Foreman's
Growth Inspection, built on the book Under Construction. A user has written
their own multi-year plan in their own words. Your job is to map that plan onto
a FIXED vocabulary of eleven principles and three measurement layers, so the
app can later measure whether their daily work points where they said they want
to go.

THE ELEVEN PRINCIPLES (use these keys only, never invent or rename):
${principleVocabulary()}

THE THREE LAYERS (use these keys only):
${layerVocabulary()}

RULES:
- Map only to the vocabulary above. Never introduce a principle that is not on
  the list.
- Do not force the plan to touch all eleven. A focused plan maps heavily to a
  few. Return between ${MIN_SUGGESTIONS} and ${MAX_SUGGESTIONS} principles, the
  ones the plan most genuinely expresses.
- Success is not one route. Map honestly to this plan, not to a generic ideal.
- For each principle, name the layer it most lives in for THIS plan, and write a
  short rationale: two or three sentences, grounded and plain, addressed to the
  user as "you". Faith may be present but never preachy.
- The user has the final say and will confirm or correct your mapping. Offer it
  as a reading, not a verdict.

VOICE AND FORMAT (strict):
- No em dashes. Use commas, periods, and sentence breaks.
- No bullet points, no emoji, no hashtags inside any rationale.
- Do not score the user or imply a ceiling.

Return ONLY a JSON object, no prose around it:
{ "suggestions": [ { "principle": "<key>", "layer": "<key>", "rationale": "<text>" } ] }`;

export function buildMappingUserPrompt(plan: PlanInput): string {
  const parts = [`Ten-year plan:\n${plan.tenYear.trim()}`];
  if (plan.fiveYear && plan.fiveYear.trim()) {
    parts.push(`Five-year plan:\n${plan.fiveYear.trim()}`);
  }
  if (plan.sixMonth && plan.sixMonth.trim()) {
    parts.push(`Six-month milestone:\n${plan.sixMonth.trim()}`);
  }
  parts.push(
    "Map this plan to the principles and layers. Return the JSON object only.",
  );
  return parts.join("\n\n");
}

// Permissive JSON extraction, mirroring lib/anthropic.ts: models sometimes wrap
// the object in ```json fences or stray prose.
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** True only if the rationale is clean user-facing copy (no em dash, etc.). */
function rationaleIsClean(text: string): boolean {
  return validateReportProse(text).ok;
}

function templatedRationale(principle: PrincipleKey): string {
  const p = principleByKey(principle);
  return `Your plan leans on ${p.name.toLowerCase()}: ${p.gloss}. We mapped it here so your inspection reads your daily work against it. You can change this if it does not fit.`;
}

/**
 * Validate and normalize the model's suggestions against the fixed vocabulary.
 * Drops unknown principles, dedupes, repairs missing layers, and replaces any
 * rationale that fails governance with a clean templated one (we never ship an
 * em dash to a user, GOVERNANCE §9). Returns null if nothing usable survives.
 */
export function normalizeSuggestions(value: unknown): MappingSuggestion[] | null {
  if (typeof value !== "object" || value === null) return null;
  const rawList = (value as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(rawList)) return null;

  const seen = new Set<PrincipleKey>();
  const out: MappingSuggestion[] = [];

  for (const item of rawList) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (!isPrincipleKey(obj.principle)) continue;
    if (seen.has(obj.principle)) continue;
    seen.add(obj.principle);

    const layer = isInspectionLayer(obj.layer)
      ? obj.layer
      : DEFAULT_PRINCIPLE_LAYER[obj.principle];

    let rationale =
      typeof obj.rationale === "string" ? obj.rationale.trim() : "";
    if (rationale.length > MAX_RATIONALE) {
      rationale = rationale.slice(0, MAX_RATIONALE).trim();
    }
    if (!rationale || !rationaleIsClean(rationale)) {
      rationale = templatedRationale(obj.principle);
    }

    out.push({ principle: obj.principle, layer, rationale });
    if (out.length >= MAX_SUGGESTIONS) break;
  }

  if (out.length === 0) return null;
  out.sort((a, b) => principleByKey(a.principle).order - principleByKey(b.principle).order);
  return out;
}

/**
 * Deterministic fallback when the model is unreachable or returns nothing.
 * Seeds the mapping from the principles the user already chose to weight, so
 * the confirmation screen is never empty. Source is marked "fallback" so the
 * caller / UI can note the AI did not produce this read.
 */
export function fallbackSuggestions(
  selectedPrinciples: readonly PrincipleKey[],
): MappingSuggestion[] {
  const keys = selectedPrinciples.length
    ? selectedPrinciples
    : (["foundation", "framing"] as PrincipleKey[]);
  const seen = new Set<PrincipleKey>();
  const out: MappingSuggestion[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      principle: key,
      layer: DEFAULT_PRINCIPLE_LAYER[key],
      rationale: templatedRationale(key),
    });
  }
  out.sort((a, b) => principleByKey(a.principle).order - principleByKey(b.principle).order);
  return out;
}

/**
 * Run the mapping. Calls Claude, normalizes, and falls back deterministically
 * on any failure so the onboarding flow can always advance to confirmation.
 */
export async function mapPlanToPrinciples(
  plan: PlanInput,
  selectedPrinciples: readonly PrincipleKey[],
): Promise<MappingResult> {
  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: MAPPING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildMappingUserPrompt(plan) }],
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const suggestions = normalizeSuggestions(extractJson(text));
    if (suggestions) {
      return { suggestions, source: "ai" };
    }
  } catch (err) {
    console.error(
      "Plan mapping failed, using fallback:",
      err instanceof Error ? err.message : "unknown error",
    );
  }
  return {
    suggestions: fallbackSuggestions(selectedPrinciples),
    source: "fallback",
  };
}
