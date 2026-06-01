// Programmatic guardrails from the AI & Algorithm Governance Framework.
//
// Source of truth: docs/growth-inspection/GOVERNANCE_FRAMEWORK.md.
//
// This module covers ONLY the rules the framework says are "validated
// programmatically" (Part 2 formatting + the Part 5.3 no-state-score rule).
// The semantic rules — no claim without data (Part 4), the faith bridge
// (Part 3), voice (Part 1) — cannot be regex-checked and are enforced in the
// prompt + the human review queue, not here.
//
// Doctrine (Part 2): "A report containing an em dash is rejected and
// regenerated, not patched." So these functions VALIDATE; they never rewrite.

export type GovernanceRule =
  | "em_dash"
  | "bullet_points"
  | "emoji"
  | "hashtag_stack"
  | "state_score";

export interface GovernanceViolation {
  rule: GovernanceRule;
  /** Human-readable reason, safe to log (no user PII). */
  message: string;
  /** The first offending snippet, for debugging the regeneration loop. */
  sample: string;
}

export interface GovernanceResult {
  ok: boolean;
  violations: GovernanceViolation[];
}

// U+2014 EM DASH. The one character the framework names explicitly.
const EM_DASH = /—/;

// A line that opens with a bullet glyph or an enumerated-list marker.
// Reports must be prose; functional UI checklists are fine but never run
// through this validator.
const BULLET_LINE = /^\s*(?:[-*+•‣◦·]|\d+[.)])\s+\S/m;

// Extended pictographic covers emoji incl. ZWJ sequences' base glyphs.
const EMOJI = /\p{Extended_Pictographic}/u;

// "#oneword" used as a tag/stack. A lone "#3" (numbering) is allowed.
const HASHTAG = /(?:^|\s)#[A-Za-z]\w*/;

// A state score implies a ceiling (GOVERNANCE 5.3): "72/100", "out of 100",
// "score of 72", "you are a 72", "rated 8 out of 10".
const STATE_SCORE =
  /\b\d{1,3}\s*\/\s*(?:100|10)\b|\bout of (?:100|ten|10)\b|\bscore (?:of|is|:)\s*\d|\byou(?:'re| are) (?:a |an )?\d{1,3}\b|\brated?\s+\d/i;

function firstMatch(re: RegExp, text: string): string {
  const m = text.match(re);
  if (!m) return "";
  const idx = m.index ?? 0;
  const start = Math.max(0, idx - 20);
  return text.slice(start, idx + m[0].length + 20).trim();
}

/**
 * Validate a block of AI-generated report prose against the programmatic
 * governance rules. Returns every violation found so the caller can log the
 * full picture before regenerating.
 */
export function validateReportProse(text: string): GovernanceResult {
  const violations: GovernanceViolation[] = [];

  if (EM_DASH.test(text)) {
    violations.push({
      rule: "em_dash",
      message: "Contains an em dash (—). Use commas, periods, or sentence breaks.",
      sample: firstMatch(EM_DASH, text),
    });
  }
  if (BULLET_LINE.test(text)) {
    violations.push({
      rule: "bullet_points",
      message: "Contains bullet points. Report prose must read as prose.",
      sample: firstMatch(BULLET_LINE, text),
    });
  }
  if (EMOJI.test(text)) {
    violations.push({
      rule: "emoji",
      message: "Contains emoji. Report copy carries no emoji.",
      sample: firstMatch(EMOJI, text),
    });
  }
  if (HASHTAG.test(text)) {
    violations.push({
      rule: "hashtag_stack",
      message: "Contains a hashtag. Report copy carries no hashtags.",
      sample: firstMatch(HASHTAG, text),
    });
  }
  if (STATE_SCORE.test(text)) {
    violations.push({
      rule: "state_score",
      message:
        "Reads like a state score (a ceiling). The inspection reports trajectory, never a state number.",
      sample: firstMatch(STATE_SCORE, text),
    });
  }

  return { ok: violations.length === 0, violations };
}

/** Convenience: true when the prose clears every programmatic rule. */
export function passesGovernance(text: string): boolean {
  return validateReportProse(text).ok;
}
