# Growth Inspection — integration overlaps with the existing app

The Growth Inspection is being built as a **parallel, additive spine**. The
existing daily-coaching / retro spine is left fully intact for now. This note
records every place the two systems overlap so the reconciliation can be made
deliberately later, rather than by accident during the build.

Decision recorded: **build additively now, reconcile later.**
(User direction, this session.)

## Overlap 1 — the word "check-in" means two different things

| | Existing | Growth Inspection (spec) |
|---|---|---|
| Table | `daily_checkins` | `cascade_checkins` |
| Mechanic | One AI coaching prompt + reflection, scored by Claude into a "situation" | Mark cascade goals complete, optional one-line reflection |
| Cadence | Daily (plus weekly retro, monthly synthesis) | Daily / weekly / monthly against the goal cascade |
| Purpose | Reflective coaching | Behavioral history that feeds the six-month inspection |

To avoid a hard collision the new table is named `cascade_checkins`. **Open
question:** do these merge into one daily ritual, or stay two separate things?
A merged ritual is less to ask of the user; two rituals keep coaching and
goal-tracking cleanly separated.

## Overlap 2 — weekly retro vs. weekly/monthly cascade check-in

`weekly_retros` (wins / struggles / lessons + AI synthesis) and
`monthly_syntheses` already deliver a periodic reflective synthesis. The spec's
weekly/monthly cascade check-ins are goal-completion reviews, and the six-month
inspection is the big synthesis. **Open question:** does the six-month
inspection supersede the monthly synthesis, or do they coexist (monthly =
reflection, six-month = measurement)?

## Overlap 3 — two "phase/principle" vocabularies

The shipped app uses a **three-phase** framework: `foundation / framing /
finishing` (see `FrameworkPhase`). The inspection uses **three layers**
(`foundation / frame / finish`) plus **eleven principles**. The names rhyme but
are not the same axis, and `finishing` (phase) vs `finish` (layer) is an easy
thing to confuse in code and copy. Canonical inspection vocabulary lives in
`lib/inspection/principles.ts`; the legacy phase vocabulary stays in
`lib/database.types.ts` (`FrameworkPhase`). Keep them distinct until a decision
is made to unify.

## Overlap 4 — daily motivations source

`lib/prompts/daily.ts` rotates 90 prompts by current phase. The spec (§5.3)
wants daily motivations to weight toward the lowest-scoring / most-stuck
principle from the latest inspection. **Open question:** rewrite the daily
prompt selection to read inspection output, or keep the rotation and layer
inspection-aware nudges on top.

## Overlap 5 — onboarding

Onboarding today is a 3-step profile wizard (identity / challenge / cadence).
The spec adds a substantial first-run flow: ten-year plan, five-year, six-month
milestone, principle selection, AI mapping, and initial cascade goals.
**Open question:** extend the existing wizard, or run the plan/cascade setup as
a separate first-run step after the current onboarding.

## Overlap 6 — subscription gating

`lib/billing.ts` already models trial / active / past_due / churned and
`canUseAi()`. The inspection is a paid membership feature, so its AI routes
should reuse `canUseAi` / `isPaywalled` rather than introduce new gating.
No conflict expected; just reuse.

## Overlap 7 — admin surface for the review queue

The governance router needs an admin-only surface for Cayden
(`review_queue_items`, `inspections.cayden_note`). There is no admin-role
concept in the app yet. Stage 1 leaves those tables service-role only (RLS
enabled, no client policy). A real decision on admin auth (an `is_admin` flag
on `profiles`, an allowlist, or a separate admin app) is needed before Stage 7.
