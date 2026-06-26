// The inspection instrument: the question bank + selection (BUILD_SPEC §4).
//
// Questions live in code (version-controlled, testable) rather than the DB so
// the instrument is deterministic and reviewable. The inspection_questions
// table remains for future admin-managed editing.
//
// Three question types (mix all three, §4.2):
//   - slider:    a 1..5 felt sense (self-assessment of an internal state)
//   - frequency: never/rarely/sometimes/often/always (behavioral anchor)
//   - scenario:  pick the response closest to what you'd actually do
//
// Every answer reduces to an "alignment" in [0,1]: how closely the user is
// operating in line with the principle/layer. Frequency questions can be
// reverse-coded (high frequency = misalignment).

import type { InspectionLayer, PrincipleKey } from "@/lib/database.types";

export type QuestionType = "slider" | "frequency" | "scenario";

export interface ScenarioOption {
  key: string;
  body: string;
  signal: number; // alignment in [0,1] for choosing this option
}

export interface InstrumentQuestion {
  key: string;
  body: string;
  type: QuestionType;
  layer: InspectionLayer;
  principle?: PrincipleKey; // frame-layer questions name a principle
  reverse?: boolean; // frequency: high frequency means misalignment
  options?: ScenarioOption[]; // scenario only
}

export const FREQUENCY_OPTIONS = [
  "never",
  "rarely",
  "sometimes",
  "often",
  "always",
] as const;
export type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number];

// ---- Foundation layer (identity / conviction; the impostor-syndrome read) ---

const FOUNDATION_QUESTIONS: InstrumentQuestion[] = [
  {
    key: "fnd_settled_identity",
    body: "When something goes wrong on my team, I still trust that I belong in this role.",
    type: "slider",
    layer: "foundation",
  },
  {
    key: "fnd_borrowed_confidence",
    body: "My confidence depends on recent wins more than on who I am.",
    type: "slider",
    layer: "foundation",
    reverse: true,
  },
  {
    key: "fnd_pressure_steadiness",
    body: "In the last month, how often did pressure pull you into a version of yourself you didn't like?",
    type: "frequency",
    layer: "foundation",
    reverse: true,
  },
  {
    key: "fnd_title_identity",
    body: "A teammate questions a hard call in front of others. What's closest to what you actually do?",
    type: "scenario",
    layer: "foundation",
    options: [
      { key: "defend_title", body: "Hold the line to protect your authority.", signal: 0.2 },
      { key: "hear_then_decide", body: "Hear them out, then decide in the open.", signal: 1 },
      { key: "cave", body: "Quietly back off to avoid the friction.", signal: 0.4 },
    ],
  },
];

// ---- Finish layer (daily behavior / application; the fastest-moving read) ----

const FINISH_QUESTIONS: InstrumentQuestion[] = [
  {
    key: "fin_daily_followthrough",
    body: "Over the last month, how often did you finish the daily goals you set for yourself?",
    type: "frequency",
    layer: "finish",
  },
  {
    key: "fin_small_things",
    body: "How often did you do the small, unseen thing well even when no one was tracking it?",
    type: "frequency",
    layer: "finish",
  },
  {
    key: "fin_reactive_dropoff",
    body: "How often did a busy week pull you off the work that actually moves your plan?",
    type: "frequency",
    layer: "finish",
    reverse: true,
  },
];

// ---- Frame layer (the eleven principles) ------------------------------------
// Two questions per principle; weighted principles use both, unweighted rotate.

const FRAME_QUESTIONS: InstrumentQuestion[] = [
  // foundation (principle): accountability, responsibility
  { key: "p_foundation_account", body: "I give a straight account of my own mistakes before anyone asks.", type: "slider", layer: "frame", principle: "foundation" },
  { key: "p_foundation_carry", body: "In the last month, how often did you carry weight that wasn't yours to carry?", type: "frequency", layer: "frame", principle: "foundation", reverse: true },
  // framing: discipline, habits, systems
  { key: "p_framing_systems", body: "My team has clear systems for how the recurring work gets done.", type: "slider", layer: "frame", principle: "framing" },
  { key: "p_framing_sharpen", body: "How often did you build the system before swinging at the work?", type: "frequency", layer: "frame", principle: "framing" },
  // mentorship
  { key: "p_mentorship_receive", body: "I actively seek out people ahead of me and let them shape how I lead.", type: "slider", layer: "frame", principle: "mentorship" },
  { key: "p_mentorship_give", body: "How often did you invest in someone behind you this month?", type: "frequency", layer: "frame", principle: "mentorship" },
  // reconciliation
  { key: "p_reconciliation_honest", body: "The version of me people see matches the version I actually am.", type: "slider", layer: "frame", principle: "reconciliation" },
  { key: "p_reconciliation_avoid", body: "How often did you avoid a conversation you knew you needed to have?", type: "frequency", layer: "frame", principle: "reconciliation", reverse: true },
  // belief
  { key: "p_belief_anchor", body: "I lead from a settled sense of purpose, not borrowed momentum.", type: "slider", layer: "frame", principle: "belief" },
  { key: "p_belief_pressure", body: "When the pressure came, what did you lead from?", type: "scenario", layer: "frame", principle: "belief", options: [
    { key: "fear", body: "Mostly fear of how it would look.", signal: 0.2 },
    { key: "duty", body: "A sense of duty to the people in it.", signal: 0.8 },
    { key: "settled", body: "A settled conviction about what was right.", signal: 1 },
  ] },
  // patience
  { key: "p_patience_unseen", body: "I can keep building well before anyone sees the results.", type: "slider", layer: "frame", principle: "patience" },
  { key: "p_patience_shortcut", body: "How often did you reach for a shortcut to be seen sooner?", type: "frequency", layer: "frame", principle: "patience", reverse: true },
  // integrity
  { key: "p_integrity_align", body: "My execution matches the vision I say I'm building toward.", type: "slider", layer: "frame", principle: "integrity" },
  { key: "p_integrity_cost", body: "How often did you do the right thing knowing it would cost you something?", type: "frequency", layer: "frame", principle: "integrity" },
  // refinement
  { key: "p_refinement_finish", body: "I do the finish work well after the excitement of a project fades.", type: "slider", layer: "frame", principle: "refinement" },
  { key: "p_refinement_quality", body: "How often did you choose quality repetition over just getting it done?", type: "frequency", layer: "frame", principle: "refinement" },
  // culture
  { key: "p_culture_protect", body: "I actively protect the environment my team works inside.", type: "slider", layer: "frame", principle: "culture" },
  { key: "p_culture_tolerate", body: "How often did you tolerate something that quietly eroded the culture?", type: "frequency", layer: "frame", principle: "culture", reverse: true },
  // discernment
  { key: "p_discernment_boundaries", body: "I know what to let into my work and life and what to keep out.", type: "slider", layer: "frame", principle: "discernment" },
  { key: "p_discernment_overcommit", body: "How often did you say yes when the wise answer was no?", type: "frequency", layer: "frame", principle: "discernment", reverse: true },
  // pressure
  { key: "p_pressure_hold", body: "What I've built holds when it gets tested under real pressure.", type: "slider", layer: "frame", principle: "pressure" },
  { key: "p_pressure_inspection", body: "How often did a high-pressure moment reveal a crack you hadn't seen?", type: "frequency", layer: "frame", principle: "pressure", reverse: true },
];

export const ALL_QUESTIONS: readonly InstrumentQuestion[] = [
  ...FOUNDATION_QUESTIONS,
  ...FINISH_QUESTIONS,
  ...FRAME_QUESTIONS,
];

const FRAME_BY_PRINCIPLE = new Map<PrincipleKey, InstrumentQuestion[]>();
for (const q of FRAME_QUESTIONS) {
  if (!q.principle) continue;
  const arr = FRAME_BY_PRINCIPLE.get(q.principle) ?? [];
  arr.push(q);
  FRAME_BY_PRINCIPLE.set(q.principle, arr);
}

const MAX_QUESTIONS = 25;

/**
 * Build one inspection's question set (BUILD_SPEC §4.1, §4.3):
 * foundation + finish reads, full coverage of the user's weighted principles,
 * and a single rotated light-reading question for each unweighted principle.
 */
export function selectInspectionQuestions(
  weighted: readonly PrincipleKey[],
  cycleNumber: number,
): InstrumentQuestion[] {
  const weightedSet = new Set(weighted);
  const out: InstrumentQuestion[] = [];

  out.push(...FOUNDATION_QUESTIONS, ...FINISH_QUESTIONS);

  // Weighted principles: full coverage (in canonical order for stability).
  for (const [principle, qs] of FRAME_BY_PRINCIPLE) {
    if (weightedSet.has(principle)) out.push(...qs);
  }

  // Unweighted principles: one rotated light question each.
  const light: InstrumentQuestion[] = [];
  for (const [principle, qs] of FRAME_BY_PRINCIPLE) {
    if (weightedSet.has(principle)) continue;
    light.push(qs[((cycleNumber - 1) % qs.length + qs.length) % qs.length]);
  }
  out.push(...light);

  return out.slice(0, MAX_QUESTIONS);
}

export function questionByKey(key: string): InstrumentQuestion | undefined {
  return ALL_QUESTIONS.find((q) => q.key === key);
}

/**
 * Reduce a raw answer to an alignment in [0,1], or null if unanswerable.
 * slider: 1..5. frequency: a FrequencyValue. scenario: an option key.
 */
export function answerAlignment(
  question: InstrumentQuestion,
  raw: unknown,
): number | null {
  if (question.type === "slider") {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 5) return null;
    const a = (n - 1) / 4;
    return question.reverse ? 1 - a : a;
  }
  if (question.type === "frequency") {
    const idx = FREQUENCY_OPTIONS.indexOf(raw as FrequencyValue);
    if (idx < 0) return null;
    const a = idx / (FREQUENCY_OPTIONS.length - 1);
    return question.reverse ? 1 - a : a;
  }
  // scenario
  const opt = question.options?.find((o) => o.key === raw);
  return opt ? opt.signal : null;
}
