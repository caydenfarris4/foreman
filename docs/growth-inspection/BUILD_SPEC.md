# Foreman: Growth Inspection Feature
## Build Specification for Claude Code

**Version:** 1.0
**Owner:** Cayden Farris
**Companion product:** *Under Construction* (book)
**Subscription tier:** Included in the $20/month Foreman membership

---

## 1. What we are building

The Growth Inspection is the measurement spine of Foreman. It is not a quiz and must never
be presented as one. It is a **building inspection**. The user "walks the site" to see what is
holding, what is settling, and what needs attention before they build the next floor.

The inspection runs on a six-month cycle. Between inspections, the user works a **goal cascade**:
a ten-year plan at the top, narrowing down through five-year, six-month, monthly, weekly, and
daily goals. The inspection reads the user's stated trajectory against their actual behavior and
reports the gap, whether it is narrowing, and what to do about it.

The user writes their own goals in their own words. Foreman does not prescribe the destination.
It maps each goal to the principles in *Under Construction* and measures whether the user's daily
work is actually pointed at where they said they want to go.

This is a direct expression of the book's thesis: success is not one route. The principles of
building are the same across every route.

---

## 2. Core concepts and definitions

### 2.1 The goal cascade (the pyramid)

Six levels. Each level derives from the one above it.

1. **Ten-year plan**: direction. Who the user is becoming. Written freely by the user.
2. **Five-year plan**: the major milestones on the way to the ten-year direction.
3. **Six-month milestone**: the checkpoint the next inspection measures against.
4. **Monthly goals**: the building phases.
5. **Weekly goals**: the work orders.
6. **Daily goals**: the tasks on the site.

A lower-level goal is valid only if it ladders up to the level above it. A daily goal that serves
no weekly goal, or a weekly goal that serves no monthly goal, is a **disconnected goal** and must
be flagged (see 4.4).

### 2.2 The trajectory score

Foreman does **not** produce a state score ("you are a 72"). A state score implies a ceiling and a
finish line, which contradicts the book's central conviction of becoming over arriving.

Foreman produces a **trajectory score**: the distance between the user's *stated* path (their goal
cascade) and their *actual* path (their behavior and inspection answers), and whether that distance
is narrowing or widening over time.

A user can have a large gap and still receive an encouraging, honest report, because the gap is
always actionable. The score answers one question only: **are you on pace to become who you said
you want to become?**

The score is never compared across users. The only comparison is the user against their own past
inspections (you versus past-you).

### 2.3 The three measurement layers

Every inspection reads three layers, mapped to the book's structure:

- **Foundation**: identity and conviction. The slowest-moving layer. This is the impostor-syndrome
  layer. It measures whether the user is operating from settled identity or borrowed confidence.
  When this layer moves, it matters most.
- **Frame**: the eleven principles from the book (see 2.4). The user selects the principles they
  want to master during onboarding. The inspection weights toward those while taking a light reading
  on the rest.
- **Finish work**: daily behavior and application. The fastest-moving layer. Drawn primarily from
  the cascade completion data, not self-report. Gives the user an early visible win between the
  slower foundation shifts.

### 2.4 The eleven principles (the Frame)

These are the chapters of *Under Construction*, in construction sequence. They are the fixed
vocabulary of the Frame layer. Do not rename, reorder, or invent principles.

1. **Foundation**: accountability, responsibility, the unseen base
2. **Framing**: discipline, habits, systems, the part of you the world sees
3. **Mentorship**: receiving from those ahead, giving to those behind, the long view
4. **Reconciliation**: internal honesty, getting the presented self and the actual self to agree
5. **Belief**: identity, the power source, what turns the lights on
6. **Patience**: building before anyone can see it, the harvest you do not witness
7. **Integrity**: alignment of execution with vision, releasing the title you are protecting
8. **Refinement**: interior finish, the small things done well after the excitement fades
9. **Culture**: the environment a leader creates and protects
10. **Discernment**: boundaries, knowing what to let in and what to keep out
11. **Pressure**: the moment everything built gets tested and inspected

---

## 3. User flows

### 3.1 Onboarding (first run only)

1. User writes their ten-year plan in free text. No template forced. Minimum length enforced
   (suggest 200 characters) so there is enough substance to map.
2. User derives a five-year plan and a six-month milestone. The UI shows the ten-year plan
   above each field as an anchor so the user keeps the higher level in view.
3. User selects the principles from the Frame they most want to master. Allow 2 to 4. These
   become the weighted principles for their inspections.
4. The AI maps the free-text plan to the eleven principles and the three layers (see governance
   framework, section on mapping). It returns the mapping to the user for confirmation. The user
   can correct the mapping. **The user always has the final say on the mapping.**
5. User sets initial monthly, weekly, and daily goals that ladder up to the six-month milestone.

### 3.2 The baseline inspection (first six-month walk)

The first inspection produces a **baseline report**, not a comparison. It establishes the starting
read across the three layers and ties directly to the goals and principles the user set.
No overall number that implies a ceiling.

### 3.3 Recurring inspections (every six months thereafter)

Each subsequent inspection produces a **comparison report**:
- What moved
- What held steady
- One honest note on what is settling or cracking (see governance, hard-note rules)
- Updated trajectory read: gap narrowing or widening
- Next actions feeding back into the cascade

### 3.4 The in-between check-ins (the texture)

Between six-month inspections, the user works the lower cascade levels:
- **Daily check-in**: mark daily goals complete, one-line reflection optional
- **Weekly check-in**: review the week's work orders against the monthly goal
- **Monthly check-in**: review the month's building phase against the six-month milestone

This completion and reflection data is stored and becomes the behavioral history the six-month
inspection reads. The inspection's read on "what is holding and what is settling" is built on this
real history, not on two distant self-assessments.

---

## 4. The inspection instrument

### 4.1 Length

20 to 25 questions per inspection. Long enough to be real, short enough to finish in one sitting.
Completion rate on the second inspection is a tracked metric; if it drops, shorten before adding.

### 4.2 Question types (mix all three)

- **Self-assessment sliders**: internal states. Capture the felt sense.
  Example stem: "When I walk into a hard conversation, I feel..."
- **Behavioral frequency**: the harder data and the anchor of the instrument. People self-deceive
  on feeling questions and tell the truth on frequency questions.
  Example stem: "In the last month, how often did you make a decision you could not fully justify yet?"
- **Scenario response**: one or two per inspection. A short situation, the user picks the response
  closest to what they would actually do. Reveals the belief-behavior gap. The gap closing over six
  months is one of the clearest growth signals.

### 4.3 Question routing by principle weight

Weighted principles (the user's chosen 2 to 4) get full coverage. Unweighted principles get a
single light-reading question each, rotated so that over multiple inspections all eleven get touched.

### 4.4 Disconnected-goal detection

When a user sets or edits goals, run the cascade integrity check. If a daily/weekly/monthly goal
does not ladder up to the level above it, surface a gentle question, not an error. Example:
"This daily goal does not seem to connect to your weekly goal yet. Want to adjust one of them?"
Never block the user. The user can keep a goal the system flagged.

---

## 5. The report

The report is where the subscription earns its price. Never hand back a bare number. Hand back a
walk-through.

### 5.1 Baseline report structure

1. **The walk**: a short narrative reading of where the user stands across Foundation, Frame,
   Finish work. Written in the Foreman voice (see governance).
2. **Your foundation**: the identity read.
3. **Your frame**: the principle read, weighted to chosen principles.
4. **Your finish work**: the behavior read from cascade data.
5. **Where you are pointed**: the trajectory read against the stated plan.
6. **First work orders**: next actions that feed back into the cascade.

### 5.2 Comparison report structure (recurring)

1. **The walk since last time**: narrative of movement.
2. **What moved**: dimensions that improved, with the behavioral evidence.
3. **What held**: dimensions steady.
4. **The honest note**: one thing settling or cracking. Governed (see 6).
5. **Trajectory**: gap narrowing or widening, against the user's own plan.
6. **Next work orders**: updated cascade actions.

### 5.3 Report feeds the rest of the app

- The **chatbot** receives the latest inspection as context so it coaches against real data, not
  generic advice.
- The **daily motivations** weight toward the lowest-scoring or most-stuck principle.
- A dimension **stuck across two inspections** surfaces a prompt to book a paid coaching session
  with Cayden. Stuck-for-a-year is exactly when a person needs a human.

---

## 6. The governance router (critical)

The AI does not clear every report on its own. A report is **auto-cleared** (AI handles end to end,
Cayden never sees it) when the user is progressing roughly on pace and no flag fires.

A report is **routed to Cayden's review queue** when any of these fire:

- A dimension is **stuck or declining across two consecutive inspections**
- The **Foundation layer** shows a real drop (identity / impostor-syndrome signal)
- The user's **daily behavior has fallen off** for a defined stretch
- The AI's **own confidence on its read is low**
- The report contains a **hard note** ("something is cracking"): routed by default until Cayden
  has watched the algorithm deliver enough of them to trust it unsupervised

The AI **drafts** flagged reports including the hard note. Cayden decides whether each sends as-is
or with his personal note added. The user-facing report should carry Cayden's note seamlessly when
present, so a reviewed report feels personal, not corrected.

### 6.1 Scale math (design target)

At 500 users and 1,000 inspections per year, expect roughly 150 to 250 routed to review. That is a
few per day, the level Cayden can carry. The reviewed ones are the ones where a human note changes
the outcome.

The review queue must be efficient: the draft, the flag reason, the user's cascade, and the prior
inspection all on one screen. Cayden approves, edits, or adds a note in one action.

---

## 7. Data model (high level)

- `User`: auth, subscription status, role
- `Plan`: ten_year_text, five_year_text, six_month_milestone, version history
- `PrincipleSelection`: the chosen weighted principles (2 to 4)
- `PrincipleMapping`: AI mapping of free-text plan to principles/layers, plus user confirmation
- `Goal`: level (daily/weekly/monthly/six_month/five_year/ten_year), parent_goal_id, text,
  status, period, ladders_up boolean
- `CheckIn`: type (daily/weekly/monthly), goals completed, reflection text, timestamp
- `Inspection`: cycle number, baseline boolean, raw answers, layer reads, trajectory read,
  generated_report, flag_status, reviewed_by, cayden_note, sent_at
- `Question`: text, type, principle, layer, weight tier, rotation group
- `ReviewQueueItem`: inspection_id, flag_reasons[], status

All scoring is per-user and historical. Never store or compute cross-user rankings.

---

## 8. Build order

1. Goal cascade data model and the cascade UI (pyramid view)
2. Onboarding flow including AI mapping with user confirmation
3. Daily / weekly / monthly check-ins
4. Inspection instrument (question bank + delivery)
5. Scoring engine (trajectory math, three-layer reads) governed by the framework doc
6. Report generation (governed by the framework doc)
7. Governance router and Cayden's review queue
8. Wiring report output into chatbot context, daily motivations, and coaching-session prompts

---

## 9. Non-negotiables (do not violate)

- No em dashes anywhere in user-facing copy. Commas, periods, sentence breaks carry rhythm.
- No bullet points in user-facing report prose. Reports read as prose. (Bullets are fine in the
  app's functional UI, like a checklist of goals.)
- Short paragraphs in report copy. White space is part of the voice.
- The voice is the book's voice. Clear, direct, grounded, warm, honest, faith-present without
  being preachy, humble without self-erasing. See the governance framework for the full voice spec.
- Never a state score. Always a trajectory.
- Never a cross-user comparison.
- The user always owns their goals and their plan-to-principle mapping.
- The AI may only speak to dimensions where it has data. No data, no claim.
