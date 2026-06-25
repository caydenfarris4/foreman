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

1. **Goal cascade data model** — Stage 1, shipped.
2. **Onboarding flow incl. AI mapping with user confirmation** — Stage 2, shipped.
3. Daily / weekly / monthly check-ins — not started.
4. Inspection instrument (question bank + delivery) — not started.
5. Scoring engine (trajectory math) — not started.
6. Report generation — not started.
7. Governance router + Cayden's review queue — not started.
8. Wiring into chatbot / daily motivations / coaching prompts — not started.

### Stage 2 shipped

- `lib/inspection/mapping.ts` — the AI plan-to-principle mapping engine: prompt,
  parse, governance validation of rationale prose, and a deterministic fallback
  seeded from the user's chosen principles (GOVERNANCE Part 8, BUILD_SPEC §3.1).
- `app/api/inspection/map/route.ts` — auth-gated, rate-limited, paywalled route
  that runs the mapping and returns suggestions for the user to confirm.
- `app/inspection/start/` — the five-step onboarding wizard (ten-year direction,
  milestones, principle selection, mapping confirmation, starting cascade) with
  the save server action. The user owns the final mapping and all goals.
- Dashboard entry point: a setup card shows until the user has a current plan.

### Stage 1 shipped

- `supabase/migrations/0006_growth_inspection.sql` — the full additive schema
  (plans, principle selections + mappings, goal cascade, cascade check-ins,
  question bank, inspections, review queue) with RLS.
- `lib/inspection/principles.ts` — the canonical 11 principles + 3 layers and
  selection validation.
- `lib/inspection/governance.ts` — programmatic governance validators
  (em dash, bullets, emoji, hashtags, state-score) for AI report prose.
- `lib/database.types.ts` — TypeScript row types for every new table.
