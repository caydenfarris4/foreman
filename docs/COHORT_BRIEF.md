# Foreman Cohorts — Build Brief

## Context

This document extends the existing Foreman Next.js application (see `PROJECT_BRIEF.md` for the base architecture). It adds a cohort-based group coaching program as a second revenue stream alongside the $19/month subscription. Build this on top of the existing app — same repo, same database, same auth.

## Product Overview

The Foreman Cohort is an 8-week closed group program for first-time managers. Twelve participants per cohort, $800 flat per participant, run quarterly (4 cohorts per year). Each cohort meets weekly for 90 minutes via Zoom on **Saturday mornings at 10am Mountain Time**. The author (Cayden) facilitates all sessions personally. One guest mentor joins for sessions 3 and 6, and offers 30-minute office-hours slots to participants between weeks 3 and 7.

Participants get free Foreman app access for 12 weeks total (8 weeks of cohort + 4 weeks post-completion). After that they convert to paid subscription or churn naturally. Existing app subscribers get a $150 discount ($650 instead of $800) at checkout, automatically applied if they have an active subscription.

## Revenue Model

- Cohort price: **$800** (one-time payment, not subscription)
- Subscriber discount: **-$150** (existing app subs pay $650)
- Cohort revenue per run: 12 × $800 = $9,600 (or mixed with discounts, ~$8,000–9,000)
- Annual cohort revenue at full capacity: ~$32,000–36,000
- Guest mentor cost per cohort: ~$1,500–3,000 (2 sessions × $750–1,500)
- Net cohort revenue annual: ~$25,000–30,000

## Stack

Same as base Foreman — Next.js 15, TypeScript, Supabase, Stripe, Resend, Vercel. No new external services for MVP. Zoom is managed externally; we only store meeting URLs in the database.

---

## Database Schema Additions

Run these migrations on top of the existing Foreman schema.

```sql
-- Cohorts
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  start_date date not null,
  end_date date not null,
  capacity int not null default 12,
  price_cents int not null default 80000,
  subscriber_discount_cents int default 15000,
  status text not null default 'draft' check (status in 
    ('draft','open','full','in_progress','completed','archived')),
  stripe_product_id text,
  stripe_price_id_standard text,
  stripe_price_id_subscriber text,
  hero_quote text,
  curriculum_summary text,
  created_at timestamptz default now()
);

-- Mentors roster
create table mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  company text,
  bio text,
  photo_url text,
  email text,
  linkedin_url text,
  expertise_areas text[] default '{}',
  rate_per_session_cents int default 75000,
  values_aligned boolean default false,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- Cohort sessions (8 per cohort)
create table cohort_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  session_number int not null check (session_number between 1 and 8),
  title text not null,
  framework_phase text check (framework_phase in 
    ('foundation','framing','finishing')),
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int default 90,
  meeting_url text,
  guest_mentor_id uuid references mentors(id) on delete set null,
  prep_materials text,
  recording_url text,
  facilitator_notes text,
  created_at timestamptz default now(),
  unique (cohort_id, session_number)
);

-- Cohort participants
create table cohort_participants (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  application_text text not null,
  why_joining text,
  current_team_size int,
  current_challenge text,
  agreed_to_commitment boolean default false,
  status text not null default 'applied' check (status in 
    ('applied','accepted','rejected','paid','enrolled','completed','withdrew')),
  stripe_payment_intent_id text,
  amount_paid_cents int,
  applied_at timestamptz default now(),
  accepted_at timestamptz,
  enrolled_at timestamptz,
  completed_at timestamptz,
  withdrew_at timestamptz,
  testimonial text,
  testimonial_approved boolean default false,
  free_app_access_until timestamptz,
  unique (cohort_id, user_id)
);

-- Attendance per session
create table session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references cohort_sessions(id) on delete cascade,
  participant_id uuid references cohort_participants(id) on delete cascade,
  attended boolean default false,
  joined_at timestamptz,
  left_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  unique (session_id, participant_id)
);

-- 1:1 office hours with mentor
create table office_hours_bookings (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  participant_id uuid references cohort_participants(id) on delete cascade,
  mentor_id uuid references mentors(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes int default 30,
  meeting_url text,
  status text default 'scheduled' check (status in 
    ('scheduled','completed','no_show','rescheduled','cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- Waitlist for sold-out cohorts
create table cohort_waitlist (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  email text not null,
  name text,
  notified boolean default false,
  notified_at timestamptz,
  created_at timestamptz default now(),
  unique (cohort_id, email)
);

-- Add admin flag to existing profiles table
alter table profiles add column if not exists is_admin boolean default false;

-- Row-level security
alter table cohorts enable row level security;
alter table cohort_sessions enable row level security;
alter table cohort_participants enable row level security;
alter table session_attendance enable row level security;
alter table office_hours_bookings enable row level security;
alter table cohort_waitlist enable row level security;
alter table mentors enable row level security;

-- Anyone can read non-draft cohorts (public marketing)
create policy "public reads open and active cohorts" on cohorts
  for select using (status in ('open','full','in_progress','completed'));

-- Participants see their own enrollment
create policy "participants see own enrollment" on cohort_participants
  for select using (auth.uid() = user_id);

-- Participants see sessions of their enrolled cohort
create policy "participants see own cohort sessions" on cohort_sessions
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.cohort_id = cohort_sessions.cohort_id
      and cp.user_id = auth.uid()
      and cp.status in ('paid','enrolled','completed')
    )
  );

-- Participants see their own attendance
create policy "participants see own attendance" on session_attendance
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.id = session_attendance.participant_id
      and cp.user_id = auth.uid()
    )
  );

-- Participants see their own office hours
create policy "participants see own office hours" on office_hours_bookings
  for select using (
    exists (
      select 1 from cohort_participants cp
      where cp.id = office_hours_bookings.participant_id
      and cp.user_id = auth.uid()
    )
  );

-- Mentors visible publicly (bios on cohort pages)
create policy "public reads active mentors" on mentors
  for select using (active = true);

-- Admin actions check profile.is_admin at the API layer, not in RLS
```

After running migrations, manually set Cayden's profile to admin:
```sql
update profiles set is_admin = true where email = 'cayden@foreman.coach';
```

---

## Routes to Build

### Public (unauthenticated)

- `/cohorts` — Landing page listing upcoming open cohorts with hero, methodology overview, "Apply Now" CTAs
- `/cohorts/[slug]` — Single cohort detail page: dates, curriculum, mentor bios, FAQ, application CTA
- `/cohorts/[slug]/apply` — Multi-step application form (requires auth; redirects to signup if not logged in)
- `/cohorts/[slug]/waitlist` — Waitlist signup when cohort is full

### Authenticated (Participant)

- `/app/cohort` — Cohort dashboard if enrolled: upcoming session, prep materials, attendance status, office hours booking, peer directory (opt-in only)
- `/app/cohort/sessions/[number]` — Session detail: time, Zoom link, prep materials, post-session recording and notes
- `/app/cohort/office-hours` — Book a 30-minute 1:1 slot with the guest mentor (only available weeks 3–7)

### Admin (`profile.is_admin = true`)

- `/admin` — Admin home with quick stats
- `/admin/cohorts` — List all cohorts with applications-pending counter, revenue, status
- `/admin/cohorts/new` — Create new cohort
- `/admin/cohorts/[id]` — Cohort detail with participants, sessions, status
- `/admin/cohorts/[id]/applications` — Review and approve/reject applications
- `/admin/cohorts/[id]/sessions` — Manage session schedule, prep materials, mentor assignments
- `/admin/cohorts/[id]/participants` — Participant management (status changes, attendance, notes)
- `/admin/mentors` — Mentor roster CRUD

### API Routes

- `POST /api/cohorts/[slug]/apply` — Submit application (creates `cohort_participants` row with status `applied`)
- `POST /api/cohorts/[id]/checkout` — Create Stripe Checkout session for approved applicant
- `POST /api/cohorts/[slug]/waitlist` — Join waitlist
- `POST /api/cohort/office-hours/book` — Book office hours slot
- `POST /api/admin/cohorts` — Create/update cohort
- `PATCH /api/admin/applications/[id]` — Approve/reject application
- `POST /api/admin/sessions/[id]/recording` — Add recording URL post-session
- `POST /api/admin/sessions/[id]/attendance` — Bulk update attendance

### Webhook handler extension

Extend the existing `/api/stripe/webhook` handler. When `checkout.session.completed` fires:
1. Read `metadata.type` from the session
2. If `type === 'subscription'` → existing subscription logic
3. If `type === 'cohort'` → update `cohort_participants.status` to `paid`, set `stripe_payment_intent_id`, set `amount_paid_cents`, set `free_app_access_until = cohort.end_date + interval '4 weeks'`, send welcome email

---

## Cohort Lifecycle (Status Transitions)

**Cohort statuses:**
- `draft` → `open` (admin opens applications)
- `open` → `full` (auto when 12 paid participants enrolled)
- `open` | `full` → `in_progress` (auto on `start_date` via daily cron)
- `in_progress` → `completed` (auto on `end_date` via daily cron)
- `completed` → `archived` (manual)

**Participant statuses:**
- `applied` → `accepted` (admin approves, with 7-day payment window)
- `applied` → `rejected` (admin declines)
- `accepted` → `paid` (Stripe webhook fires)
- `paid` → `enrolled` (auto on cohort `start_date`)
- `enrolled` → `completed` (auto on cohort `end_date`)
- `enrolled` → `withdrew` (manual by admin or self-service request)
- `accepted` → `applied` (auto-revert if payment not completed within 7 days)

---

## Email Automation (Resend)

All emails use React Email templates for consistency. Voice matches the Foreman brand — warm, direct, foreman-on-a-job-site, no exclamation points, no emoji.

| Trigger | Email |
|---|---|
| Application submitted | Confirmation: "Got your application — I'll respond within 5 business days" |
| Application accepted | Acceptance + Stripe Checkout link (7-day expiry) |
| Application rejected | Friendly decline with invitation to the next cohort |
| Payment confirmed | Welcome packet: full cohort schedule, what to expect, prep for session 1, Slack/community invite |
| 24 hours before each session | Session reminder with prep materials link and Zoom URL |
| 2 hours after each session | Recording link + session notes + preview of next session |
| Week 4 (mid-program) | Check-in: how it's going, request for feedback |
| Week 8 final session | Completion confirmation + testimonial request + Foreman subscription offer ($15/mo loyalty rate) |
| 4 weeks post-completion | "Your free Foreman access expires in 7 days — continue at $15/mo locked in" |
| Cohort full + waitlist | "Next cohort opens [date] — you'll get first dibs at applications" |

---

## Business Rules

1. **Application required.** No open checkout. Cayden reviews every applicant before they can pay.
2. **Application SLA:** Respond within 5 business days. If no response in 5 days, the system surfaces a high-priority alert in admin home.
3. **Payment window:** 7 days from acceptance. If unpaid after 7 days, slot returns to available and applicant is auto-emailed with another chance to pay or release the slot.
4. **Refund policy:** Full refund before session 2 (within 2 weeks of cohort start). No refund after that. State this in the application agreement.
5. **Attendance expectation:** Miss 3+ sessions and you don't get a completion certificate. Document in application agreement.
6. **Capacity hard cap:** 12 paid participants. When 12 paid, cohort flips to `full` and remaining applicants auto-route to waitlist for next cohort.
7. **Subscriber discount:** Apply automatically at checkout if the user has `subscription_status = 'active'` on their profile. Don't make them enter a code.
8. **Free app access:** Auto-extend trial/subscription through `cohort.end_date + 4 weeks`. After that, expire and trigger upsell email.
9. **Cohort scheduling:** Sessions are Saturday 10am Mountain Time. Non-negotiable. (Aligns with Sabbath observance and weekend availability.)
10. **Quarterly cadence:** One cohort per quarter, 4 per year. No exceptions to start dates — operational predictability is the goal.

---

## Integration with Main Foreman App

1. **Navigation update:** Add "Cohort" item to the authenticated app nav. State varies by user:
   - Not applied: "Join the next cohort →" with link to `/cohorts`
   - Applied/pending: "Application under review"
   - Enrolled: "Your cohort dashboard"
   - Completed: "Past cohort archive"

2. **Daily check-in enhancement during cohort:** When a participant submits a daily check-in and they're in an active cohort, append the most recent session's principle to the coaching prompt context. Add a tag like `cohort_session_3` to the check-in record.

3. **Cohort participants bypass paywall.** Modify the existing subscription check to also pass if `cohort_participants.status in ('paid','enrolled','completed')` and `now() < free_app_access_until`.

4. **Post-cohort upsell.** As the 12-week free access window closes (7-day warning), surface an in-app banner: "Continue with Foreman for $15/mo (vs $19 retail) — locked in as long as you stay subscribed." Create a Stripe coupon `COHORT_ALUMNI` that applies the $4/mo discount perpetually.

---

## Stripe Setup

1. In Stripe Dashboard, create new product: **Foreman Cohort**
2. Create two prices under that product:
   - Standard: $800 USD one-time
   - Subscriber: $650 USD one-time
3. Store IDs in `cohorts.stripe_product_id`, `stripe_price_id_standard`, and `stripe_price_id_subscriber`
4. Checkout session metadata must include:
   ```json
   {
     "type": "cohort",
     "cohort_id": "<uuid>",
     "participant_id": "<uuid>",
     "user_id": "<uuid>"
   }
   ```
5. Update the production webhook destination's events to also include any new event types needed (none required if using only `checkout.session.completed`).
6. Stripe webhook idempotency: track processed `event.id` values in a `stripe_webhook_events` table. If the same event fires twice, no-op the second time.

---

## Admin Panel Requirements

Auth gate: `profile.is_admin === true`. Check at both the page level (server-side redirect if false) and the API layer (return 403). Do not rely solely on client-side gates.

Core admin functions:

- Create cohort with all metadata (auto-generates 8 weekly sessions from `start_date`)
- Review applications with full applicant context (current_role, team_size, current_challenge, why_joining)
- Approve/reject applications with one click; rejection triggers auto-email
- Assign guest mentor to specific sessions (default: sessions 3 and 6)
- Upload prep materials per session (markdown editor)
- Mark attendance after each session (bulk toggle UI)
- Add recording URL post-session
- Export participant list (CSV)
- Revenue dashboard: cohort gross, mentor costs (manual entry), net margin

---

## Build Order

Build in this exact sequence. Do not skip ahead.

1. **Database migrations** — All tables, indexes, and RLS policies above
2. **Public marketing pages** — `/cohorts` and `/cohorts/[slug]` (initially with hardcoded sample data; wire up DB after step 4)
3. **Application flow** — `/cohorts/[slug]/apply` multi-step form, submission API, status `applied`
4. **Admin panel** — Cohort creation, application list, approve/reject flow, mentor management
5. **Stripe integration** — Checkout session creation, webhook routing for `type: cohort`, payment confirmation flow
6. **Participant dashboard** — `/app/cohort` and `/app/cohort/sessions/[number]`
7. **Email automation** — All Resend templates and trigger logic
8. **Office hours booking** — `/app/cohort/office-hours` with scheduling logic
9. **Waitlist** — Sign-up form + notification trigger when next cohort opens

Phases 1–5 constitute a functional MVP that can sell and run a cohort manually. Phases 6–9 can be built during the first cohort run if needed — Cayden can email participants manually for the first cohort if necessary.

---

## What NOT to Build for MVP

- Live video integration (Zoom is external; only store meeting URLs)
- Cohort-internal chat or community feature (use external Slack workspace or Circle.so)
- Calendar integration / iCal feed for sessions (manual download fine for v1)
- Automated certificate generation (manual PDF for first 2 cohorts)
- Mentor pay/invoicing automation (track in spreadsheet; pay manually)
- Recording transcription or AI session summaries
- Peer matching algorithms or formal mentor pairing (deliberately out of scope)
- Cohort-to-cohort networking features
- Mobile-specific cohort views (responsive web is sufficient for v1)
- Public discount codes (only the automatic subscriber discount)
- Multi-currency pricing
- Affiliate tracking for the cohort tier

---

## Quality Bar

- Application form must save draft state on every keystroke (no losing application progress on accidental refresh)
- All admin actions require explicit confirmation modal
- Email send failures must be logged and retryable
- Stripe webhook idempotency: if the same `checkout.session.completed` fires twice, do not double-enroll
- All times displayed in user's local timezone with `(10:00 AM MT)` noted parenthetically
- Cohort detail pages must be server-rendered and SEO-indexable
- Accessibility: all forms work fully with keyboard and screen readers
- Application form validation runs on both client and server; never trust client-only
- The application submission API enforces rate limiting (5 applications per email per 24 hours)

---

## Future Considerations (Do Not Build Now)

- Higher-tier cohort with formal 1:1 mentor pairing ($1,500–2,000 price point)
- Alumni community / past-cohort access tier ($10/month for ongoing access to alumni Slack and quarterly alumni sessions)
- Corporate cohorts (sold to companies for their first-time manager classes)
- Recorded async cohort version for international time zones
- Annual cohort pass (all 4 cohorts in a year for repeat participants)
- Cohort sponsor partnerships (a relevant tool sponsors a cohort in exchange for being mentioned)

Build the core program. Run 2–3 cohorts. Then revisit this list — most items here will be obvious or obviously wrong after seeing 24–36 actual participants go through the program.

---

## Notes for Implementation

Read this entire brief before writing a single file. Ask the user clarifying questions about anything ambiguous before starting. When you start, build in the order specified above and check in after each phase is working end-to-end. The existing Foreman app architecture and conventions take precedence — match the patterns already in the codebase (auth, error handling, route structure, component library) rather than introducing new ones.

The most critical correctness requirements are: (1) Stripe webhook idempotency, (2) RLS policies that prevent cross-cohort data leakage, (3) the admin auth gate enforced at the API layer not just the UI, (4) the auto-revert of accepted-but-unpaid applications after 7 days. Get these right; everything else can be iterated.
