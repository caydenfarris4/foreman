// The fixed vocabulary of the Growth Inspection.
//
// Source of truth: docs/growth-inspection/BUILD_SPEC.md §2.3 (layers) and
// §2.4 (the eleven principles). The governance framework (Part 8) forbids
// renaming, reordering, or inventing principles, so this file is the single
// canonical list. Question banks, plan→principle mappings, and report
// generation all read from here.

/** The three measurement layers an inspection reads (BUILD_SPEC §2.3). */
export type InspectionLayer = "foundation" | "frame" | "finish";

/** The eleven principles, keyed in construction sequence (BUILD_SPEC §2.4). */
export type PrincipleKey =
  | "foundation"
  | "framing"
  | "mentorship"
  | "reconciliation"
  | "belief"
  | "patience"
  | "integrity"
  | "refinement"
  | "culture"
  | "discernment"
  | "pressure";

export interface InspectionLayerDef {
  key: InspectionLayer;
  /** Display name as it appears in the report ("Your foundation", etc.). */
  name: string;
  /** One-line read of what the layer measures. */
  gloss: string;
  /**
   * Relative pace of movement. The scoring engine must respect this:
   * a flat Foundation read across one cycle is normal, not failure
   * (GOVERNANCE Part 5.2 — "slow layers move slowly").
   */
  pace: "slow" | "medium" | "fast";
}

export interface PrincipleDef {
  key: PrincipleKey;
  /** 1-based construction sequence. Do not reorder (BUILD_SPEC §2.4). */
  order: number;
  /** Display name. Note: capitalized canonical name, not the key. */
  name: string;
  /** The chapter gloss, verbatim from BUILD_SPEC §2.4. */
  gloss: string;
}

export const INSPECTION_LAYERS: readonly InspectionLayerDef[] = [
  {
    key: "foundation",
    name: "Foundation",
    gloss:
      "Identity and conviction. Whether the user operates from settled identity or borrowed confidence. The impostor-syndrome layer.",
    pace: "slow",
  },
  {
    key: "frame",
    name: "Frame",
    gloss:
      "The eleven principles. Weighted toward the 2 to 4 the user chose to master, with a light reading on the rest.",
    pace: "medium",
  },
  {
    key: "finish",
    name: "Finish work",
    gloss:
      "Daily behavior and application, drawn from cascade completion data rather than self-report. The fastest-moving layer.",
    pace: "fast",
  },
] as const;

export const PRINCIPLES: readonly PrincipleDef[] = [
  {
    key: "foundation",
    order: 1,
    name: "Foundation",
    gloss: "accountability, responsibility, the unseen base",
  },
  {
    key: "framing",
    order: 2,
    name: "Framing",
    gloss: "discipline, habits, systems, the part of you the world sees",
  },
  {
    key: "mentorship",
    order: 3,
    name: "Mentorship",
    gloss: "receiving from those ahead, giving to those behind, the long view",
  },
  {
    key: "reconciliation",
    order: 4,
    name: "Reconciliation",
    gloss:
      "internal honesty, getting the presented self and the actual self to agree",
  },
  {
    key: "belief",
    order: 5,
    name: "Belief",
    gloss: "identity, the power source, what turns the lights on",
  },
  {
    key: "patience",
    order: 6,
    name: "Patience",
    gloss: "building before anyone can see it, the harvest you do not witness",
  },
  {
    key: "integrity",
    order: 7,
    name: "Integrity",
    gloss:
      "alignment of execution with vision, releasing the title you are protecting",
  },
  {
    key: "refinement",
    order: 8,
    name: "Refinement",
    gloss:
      "interior finish, the small things done well after the excitement fades",
  },
  {
    key: "culture",
    order: 9,
    name: "Culture",
    gloss: "the environment a leader creates and protects",
  },
  {
    key: "discernment",
    order: 10,
    name: "Discernment",
    gloss: "boundaries, knowing what to let in and what to keep out",
  },
  {
    key: "pressure",
    order: 11,
    name: "Pressure",
    gloss: "the moment everything built gets tested and inspected",
  },
] as const;

/** Min / max weighted principles a user may select during onboarding (§3.1). */
export const MIN_WEIGHTED_PRINCIPLES = 2;
export const MAX_WEIGHTED_PRINCIPLES = 4;

const PRINCIPLE_KEYS = new Set<string>(PRINCIPLES.map((p) => p.key));
const LAYER_KEYS = new Set<string>(INSPECTION_LAYERS.map((l) => l.key));

export function isPrincipleKey(value: unknown): value is PrincipleKey {
  return typeof value === "string" && PRINCIPLE_KEYS.has(value);
}

export function isInspectionLayer(value: unknown): value is InspectionLayer {
  return typeof value === "string" && LAYER_KEYS.has(value);
}

export function principleByKey(key: PrincipleKey): PrincipleDef {
  // Safe: key is constrained to the union, every member exists in PRINCIPLES.
  return PRINCIPLES.find((p) => p.key === key)!;
}

export function layerByKey(key: InspectionLayer): InspectionLayerDef {
  return INSPECTION_LAYERS.find((l) => l.key === key)!;
}

/**
 * Validate a set of weighted-principle selections (the user's chosen 2 to 4).
 * Returns the deduped, order-stable list on success or an error string.
 */
export function validateWeightedSelection(
  keys: readonly string[],
): { ok: true; keys: PrincipleKey[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const valid: PrincipleKey[] = [];
  for (const k of keys) {
    if (!isPrincipleKey(k)) {
      return { ok: false, error: `Unknown principle: ${String(k)}` };
    }
    if (seen.has(k)) continue;
    seen.add(k);
    valid.push(k);
  }
  if (valid.length < MIN_WEIGHTED_PRINCIPLES) {
    return {
      ok: false,
      error: `Pick at least ${MIN_WEIGHTED_PRINCIPLES} principles to master.`,
    };
  }
  if (valid.length > MAX_WEIGHTED_PRINCIPLES) {
    return {
      ok: false,
      error: `Pick at most ${MAX_WEIGHTED_PRINCIPLES} principles to master.`,
    };
  }
  // Return in canonical construction order for stable storage/display.
  valid.sort((a, b) => principleByKey(a).order - principleByKey(b).order);
  return { ok: true, keys: valid };
}
