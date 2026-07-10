# Growth Inspection

The measurement spine of Foreman: a six-month "building inspection" that reads a
user's stated trajectory (their goal cascade) against their actual behavior and
reports the gap and its direction. It is **not** a quiz and is never presented
as one.

## Documents

- **BUILD_SPEC.md** — the feature spec: concepts, flows, the instrument, the
  report, the data model, and the 8-stage build order.
- **GOVERNANCE_FRAMEWORK.md** — governs every word the AI writes and every
  number the scoring algorithm produces. When the two conflict on voice, faith,
  or what the AI may claim, the governance framework wins.
- **OVERLAPS.md** — how this new spine relates to the already-shipped daily
  check-in / retro features, and the open reconciliation questions.

## Build status

Build order (BUILD_SPEC §8):

1. **Goal cascade data model + cascade UI** — done.
2. **Plan capture + AI plan→principle mapping with user confirmation** — done
   (lives in a dedicated `/app/plan` section rather than folded into the
   existing onboarding wizard; see OVERLAPS.md Overlap 5).
3. **Daily / weekly / monthly cascade check-ins** — done (`/app/plan/checkin`).
   Goal-completion tracking that becomes the behavioral history the six-month
   inspection reads. Separate from the existing AI coaching check-in.
4. **Inspection instrument** — done (`lib/inspection/questions.ts`,
   `/app/inspection`).
5. **Scoring engine** — done (`lib/inspection/scoring.ts`): trajectory math,
   three-layer reads, behavioral anchor, never a state score.
6. **Report generation** — done (`/api/inspection/submit`): governed report,
   regenerates if it breaks a programmatic rule.
7. **Governance router + review queue** — done (`lib/inspection/router.ts`,
   `/app/admin/review`).
8. **Wiring** — done (`lib/inspection/context.ts`): latest inspection feeds the
   daily coaching prompt; a stuck-across-two-cycles principle surfaces a
   "needs a human" nudge on the dashboard.

The Growth Inspection is now functional end to end: plan → cascade → check-ins
→ inspection instrument → scoring → governed report → auto-clear or review →
the report feeding back into coaching. UI/UX polish is a separate pass.

### Stage 9 shipped — cadence, growth record, delivery

- **Firm six-month cycle** (`lib/inspection/evidence.ts`): a sent report locks
  the next walk-through for 182 days (`isInspectionDue`), enforced server-side
  in `/api/inspection/submit` (409 with the days remaining) and mirrored in the
  `/app/inspection` UI as a countdown card. A baseline is available immediately.
- **Growth record** (`buildGrowthEvidence`): the submit route gathers the
  user's actual window — completed daily check-ins, boards/weekly/monthly goals
  done, retros filed, journal reflections/quotes/insights, habit checks,
  situation titles — and (a) injects it into the report prompt so the report
  walks their logged work back to them ("no data, no claim" still holds), and
  (b) freezes the counts as `growth_stats` inside the `trajectory_read` jsonb
  for the report page's "THE RECORD" strip.
- **Report page UX** (`/app/inspection`): trajectory chip (narrowing / steady /
  widening / baseline), record strip, Cayden's note styled as a personal note,
  past walk-throughs as a collapsible history, and the instrument only when the
  cycle is due.
- **Delivery = notify email → read in app** (`lib/emails/inspection.ts`):
  "Your site report is in" fires on auto-clear (submit route) and on admin
  approval (`approveInspection`, notes `hasNote`). Reports never live in email.
- **Daily cron** (`GET /api/cron/inspection`, `Bearer ${CRON_SECRET}`): sends
  the "Time to walk the site" invite the day a user's cycle unlocks (24h
  window — run the cron daily), and nudges every admin while any routed report
  sits `pending` in the review queue (routed reports never auto-release).
- Home surfaces the walk-through the day it unlocks; the baseline card waits
  until the user has at least five logged situations so nobody inspects an
  empty site.

### Stage 3 shipped

- `/app/plan/checkin` — daily/weekly/monthly cascade check-ins: mark the
  period's goals complete + an optional reflection, reviewed against the level
  above (daily→weekly, weekly→monthly, monthly→six-month).
- `app/app/plan/actions.ts` `saveCascadeCheckin` — upserts `cascade_checkins`
  and replaces `cascade_checkin_goals`; filters completions to user-owned goals
  (defense in depth on top of RLS); never mutates a goal's own status.
- `lib/inspection/periods.ts` — pure period/level math, unit-tested.

### Stage 2 shipped

- `/app/plan` — the blueprint + cascade section (new nav tab "Plan").
- `app/app/plan/blueprint-form.tsx` — ten/five/six-month capture + weighted
  principle selection (2–4).
- `app/app/plan/principle-mapper.tsx` + `app/api/plan/map/route.ts` — AI maps
  the free-text plan to the eleven principles; the user confirms/edits (final
  say) before it is stored. Governed by `lib/prompts.ts` MAPPING_SYSTEM_PROMPT
  and parsed by `parseMappingJson` (drops anything outside the fixed vocabulary).
- `app/app/plan/house/` — the six-level goal cascade, presented as the five-stage
  "build your house" journey (Vision groups ten-/five-year). `journey.tsx`
  orchestrates the progressive build visualization (2D SVG always, R3F 3D behind
  a perf gate) and the GSAP scroll sequence; `stage-section.tsx` does
  add/complete/delete per level with gentle disconnected-goal flagging (§4.4);
  `progress.ts` maps goals → build state. All writes go through the existing
  `actions.ts` (unchanged).
- `app/app/plan/actions.ts` — server actions (RLS-enforced) for plan, principle
  selection, goals, and mapping confirmation.

### Stage 1 shipped

- `supabase/migrations/0006_growth_inspection.sql` — the full additive schema
  (plans, principle selections + mappings, goal cascade, cascade check-ins,
  question bank, inspections, review queue) with RLS.
- `lib/inspection/principles.ts` — the canonical 11 principles + 3 layers and
  selection validation.
- `lib/inspection/governance.ts` — programmatic governance validators
  (em dash, bullets, emoji, hashtags, state-score) for AI report prose.
- `lib/database.types.ts` — TypeScript row types for every new table.
