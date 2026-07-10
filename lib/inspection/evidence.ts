// Growth evidence: the user's actual six months, gathered so the inspection
// report can walk them back through what they DID — check-ins written, boards
// completed, retros filed, knowledge recorded — and make the growth visible.
// "Help them recognize their growth to keep goals growing."
//
// Pure formatting over pre-fetched rows; the API route does the queries.
// The report may only claim what appears here (governance: no data, no claim).

export interface GrowthEvidenceInput {
  windowStartISO: string;
  /** Daily AI check-ins completed in the window. */
  checkinCount: number;
  /** A few situation titles from the window (their own words). */
  situationTitles: string[];
  /** Weekly retros filed + the latest framework focus, if any. */
  retroCount: number;
  latestRetroFocus: string | null;
  /** Cascade completions in the window, by level. */
  boardsCompleted: number;
  weeklyGoalsCompleted: number;
  monthlyGoalsCompleted: number;
  /** Journal record. */
  journalReflections: number;
  journalQuotes: { body: string; source: string | null }[];
  journalInsights: number;
  /** Habit checks in the window. */
  habitChecks: number;
}

export interface GrowthEvidence {
  /** Deterministic stats for the report page's "the record" strip. */
  stats: { label: string; value: number }[];
  /** Context block appended to the report system prompt ("" when empty). */
  promptBlock: string;
}

const clip = (s: string, n = 140) =>
  s.replace(/\s+/g, " ").trim().slice(0, n);

export function buildGrowthEvidence(input: GrowthEvidenceInput): GrowthEvidence {
  const stats = [
    { label: "Check-ins written", value: input.checkinCount },
    { label: "Boards completed", value: input.boardsCompleted },
    { label: "Weekly retros", value: input.retroCount },
    {
      label: "Journal entries",
      value:
        input.journalReflections +
        input.journalQuotes.length +
        input.journalInsights,
    },
    { label: "Habits checked", value: input.habitChecks },
  ].filter((s) => s.value > 0);

  const total =
    input.checkinCount +
    input.boardsCompleted +
    input.retroCount +
    input.journalReflections +
    input.journalQuotes.length +
    input.journalInsights +
    input.habitChecks;

  if (total === 0) {
    return { stats, promptBlock: "" };
  }

  const lines: string[] = [
    `GROWTH RECORD since ${input.windowStartISO.slice(0, 10)} (their actual, logged work — the report must walk them back through this record and name their growth in it, so the goals keep growing; reference only what is here):`,
    `- Daily check-ins written and coached: ${input.checkinCount}`,
    `- Daily boards completed: ${input.boardsCompleted}; weekly goals completed: ${input.weeklyGoalsCompleted}; monthly goals completed: ${input.monthlyGoalsCompleted}`,
    `- Weekly retros filed: ${input.retroCount}${input.latestRetroFocus ? ` (latest focus: ${input.latestRetroFocus})` : ""}`,
    `- Journal: ${input.journalReflections} reflections, ${input.journalQuotes.length} kept quotes, ${input.journalInsights} saved coaching insights`,
    `- Daily habits checked: ${input.habitChecks}`,
  ];

  if (input.situationTitles.length) {
    lines.push(
      `Moments they worked through (their own titles): ${input.situationTitles
        .slice(0, 4)
        .map((t) => `"${clip(t, 80)}"`)
        .join(", ")}.`,
    );
  }
  if (input.journalQuotes.length) {
    lines.push(
      `Knowledge they chose to keep: ${input.journalQuotes
        .slice(0, 2)
        .map((q) => `"${clip(q.body)}"${q.source ? ` (${clip(q.source, 60)})` : ""}`)
        .join("; ")}.`,
    );
  }

  return { stats, promptBlock: lines.join("\n") };
}

// ---- Cycle timing (firm six-month cadence) ---------------------------------

export const INSPECTION_INTERVAL_DAYS = 182;

/** When the next inspection unlocks, given the last sent report. */
export function inspectionDueAt(lastSentISO: string): string {
  const t = new Date(lastSentISO).getTime();
  return new Date(t + INSPECTION_INTERVAL_DAYS * 86400_000).toISOString();
}

export function isInspectionDue(
  lastSentISO: string | null,
  nowMs = Date.now(),
): boolean {
  if (!lastSentISO) return true; // baseline: available immediately
  return nowMs >= new Date(inspectionDueAt(lastSentISO)).getTime();
}

export function daysUntilInspection(
  lastSentISO: string,
  nowMs = Date.now(),
): number {
  const due = new Date(inspectionDueAt(lastSentISO)).getTime();
  return Math.max(0, Math.ceil((due - nowMs) / 86400_000));
}
