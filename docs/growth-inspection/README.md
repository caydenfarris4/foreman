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
3. Daily / weekly / monthly check-ins — not started.
4. Inspection instrument (question bank + delivery) — not started.
5. Scoring engine (trajectory math) — not started.
6. Report generation — not started.
7. Governance router + Cayden's review queue — not started.
8. Wiring into chatbot / daily motivations / coaching prompts — not started.

### Stage 2 shipped

- `/app/plan` — the blueprint + cascade section (new nav tab "Plan").
- `app/app/plan/blueprint-form.tsx` — ten/five/six-month capture + weighted
  principle selection (2–4).
- `app/app/plan/principle-mapper.tsx` + `app/api/plan/map/route.ts` — AI maps
  the free-text plan to the eleven principles; the user confirms/edits (final
  say) before it is stored. Governed by `lib/prompts.ts` MAPPING_SYSTEM_PROMPT
  and parsed by `parseMappingJson` (drops anything outside the fixed vocabulary).
- `app/app/plan/cascade.tsx` — the six-level goal cascade: add/complete/delete
  goals per level, link to a parent, with gentle disconnected-goal flagging (§4.4).
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
