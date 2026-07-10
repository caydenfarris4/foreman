// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type FrameworkPhase = "foundation" | "framing" | "finishing";
export type SabbathDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "none";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "churned";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role_title: string | null;
  promoted_at: string | null;
  team_size: number | null;
  team_context: string | null;
  industry: string | null;
  current_challenge: string | null;
  current_phase: FrameworkPhase;
  sabbath_day: SabbathDay;
  retro_day: Exclude<SabbathDay, "none">;
  notification_time: string;
  timezone: string;
  onboarded_at: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_current_period_end: string | null;
  trial_ends_at: string;
  is_admin: boolean;
  created_at: string;
}

export type CohortStatus =
  | "draft"
  | "open"
  | "full"
  | "in_progress"
  | "completed"
  | "archived";

export type ParticipantStatus =
  | "applied"
  | "accepted"
  | "rejected"
  | "paid"
  | "enrolled"
  | "completed"
  | "withdrew";

export interface Cohort {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_date: string;
  end_date: string;
  capacity: number;
  price_cents: number;
  subscriber_discount_cents: number | null;
  status: CohortStatus;
  stripe_product_id: string | null;
  stripe_price_id_standard: string | null;
  stripe_price_id_subscriber: string | null;
  hero_quote: string | null;
  curriculum_summary: string | null;
  created_at: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  expertise_areas: string[];
  rate_per_session_cents: number | null;
  values_aligned: boolean;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface CohortSession {
  id: string;
  cohort_id: string;
  session_number: number;
  title: string;
  framework_phase: FrameworkPhase | null;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  guest_mentor_id: string | null;
  prep_materials: string | null;
  recording_url: string | null;
  facilitator_notes: string | null;
  created_at: string;
}

export interface CohortParticipant {
  id: string;
  cohort_id: string;
  user_id: string;
  application_text: string;
  why_joining: string | null;
  current_team_size: number | null;
  current_challenge: string | null;
  agreed_to_commitment: boolean;
  status: ParticipantStatus;
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number | null;
  applied_at: string;
  accepted_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  withdrew_at: string | null;
  testimonial: string | null;
  testimonial_approved: boolean;
  free_app_access_until: string | null;
}

export interface CohortWaitlistEntry {
  id: string;
  cohort_id: string;
  email: string;
  name: string | null;
  notified: boolean;
  notified_at: string | null;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  prompt_text: string;
  user_response: string | null;
  ai_coaching: string | null;
  framework_phase: FrameworkPhase | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
}

export interface WeeklyRetro {
  id: string;
  user_id: string;
  week_start: string;
  wins: string | null;
  struggles: string | null;
  lessons: string | null;
  ai_synthesis: string | null;
  framework_focus: string | null;
  skipped: boolean;
  updated_at: string | null;
  created_at: string;
}

export interface Situation {
  id: string;
  user_id: string;
  title: string;
  situation: string;
  coaching: string;
  framework_phase: FrameworkPhase | null;
  tags: string[];
  source_checkin_id: string | null;
  created_at: string;
}

export interface SituationNote {
  id: string;
  situation_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface MonthlySynthesis {
  id: string;
  user_id: string;
  month_start: string;
  ai_summary: string;
  framework_focus: FrameworkPhase | null;
  retro_count: number;
  created_at: string;
}

// ---- Growth Inspection spine (migration 0006). ----------------------------
// Canonical principle/layer unions live in lib/inspection/principles.ts; these
// mirror the DB check constraints. Kept as literal unions here so the DB types
// stay self-contained.

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
export type InspectionLayer = "foundation" | "frame" | "finish";
export type GoalLevel =
  | "ten_year"
  | "five_year"
  | "six_month"
  | "monthly"
  | "weekly"
  | "daily";
export type GoalStatus = "open" | "done" | "dropped";
export type CascadeCheckinType = "daily" | "weekly" | "monthly";
export type InspectionQuestionType = "slider" | "frequency" | "scenario";
export type InspectionStatus = "in_progress" | "scoring" | "drafted" | "sent";
export type InspectionFlagStatus = "none" | "routed" | "cleared";
export type MappingSource = "ai" | "user";
export type ReviewStatus =
  | "pending"
  | "approved"
  | "edited"
  | "noted"
  | "resolved";

export interface GrowthPlan {
  id: string;
  user_id: string;
  version: number;
  ten_year_text: string;
  five_year_text: string | null;
  six_month_milestone: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface PrincipleSelection {
  id: string;
  user_id: string;
  plan_id: string | null;
  principle: PrincipleKey;
  created_at: string;
}

export interface PrincipleMapping {
  id: string;
  user_id: string;
  plan_id: string | null;
  principle: PrincipleKey;
  layer: InspectionLayer | null;
  ai_rationale: string | null;
  source: MappingSource;
  confirmed: boolean;
  created_at: string;
}

export interface GrowthGoal {
  id: string;
  user_id: string;
  plan_id: string | null;
  level: GoalLevel;
  parent_goal_id: string | null;
  body: string;
  status: GoalStatus;
  period_start: string | null;
  period_end: string | null;
  ladders_up: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CascadeCheckin {
  id: string;
  user_id: string;
  checkin_type: CascadeCheckinType;
  period_date: string;
  reflection: string | null;
  created_at: string;
}

export interface CascadeCheckinGoal {
  id: string;
  user_id: string;
  checkin_id: string;
  goal_id: string;
  completed: boolean;
  created_at: string;
}

export interface InspectionQuestion {
  id: string;
  question_key: string;
  body: string;
  qtype: InspectionQuestionType;
  principle: PrincipleKey | null;
  layer: InspectionLayer;
  weight_tier: "weighted" | "light";
  rotation_group: number | null;
  scenario_options: Json | null;
  active: boolean;
  created_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  cycle_number: number;
  is_baseline: boolean;
  status: InspectionStatus;
  raw_answers: Json | null;
  layer_reads: Json | null;
  trajectory_read: Json | null;
  generated_report: string | null;
  flag_status: InspectionFlagStatus;
  flag_reasons: string[];
  reviewed_by: string | null;
  cayden_note: string | null;
  started_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ReviewQueueItem {
  id: string;
  inspection_id: string;
  flag_reasons: string[];
  status: ReviewStatus;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type OfficeHoursStatus =
  | "scheduled"
  | "completed"
  | "no_show"
  | "rescheduled"
  | "cancelled";

export interface OfficeHoursBooking {
  id: string;
  cohort_id: string;
  participant_id: string;
  mentor_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  status: OfficeHoursStatus;
  notes: string | null;
  created_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  participant_id: string;
  attended: boolean;
  joined_at: string | null;
  left_at: string | null;
  notes: string | null;
  created_at: string;
}

export type JournalKind = "reflection" | "quote" | "insight";

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  prompt_text: string | null;
  body: string;
  tag: string | null;
  /** reflection = free writing; quote = kept from reading; insight = saved from the coach. */
  kind: JournalKind;
  /** Attribution for quotes ("Under Construction — C. Farris") or "Coach". */
  source: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DailyHabit {
  id: string;
  user_id: string;
  label: string;
  active: boolean;
  sort: number;
  created_at: string;
}

export interface HabitCheck {
  id: string;
  user_id: string;
  habit_id: string;
  check_date: string;
  created_at: string;
}

type RowOps<T extends { id: string; created_at: string }> = {
  Row: T;
  Insert: Omit<T, "id" | "created_at"> & Partial<Pick<T, "id" | "created_at">>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: RowOps<Profile>;
      daily_checkins: RowOps<DailyCheckin>;
      weekly_retros: RowOps<WeeklyRetro>;
      situations: RowOps<Situation>;
      situation_notes: RowOps<SituationNote>;
      monthly_syntheses: RowOps<MonthlySynthesis>;
      growth_plans: RowOps<GrowthPlan>;
      principle_selections: RowOps<PrincipleSelection>;
      principle_mappings: RowOps<PrincipleMapping>;
      growth_goals: RowOps<GrowthGoal>;
      cascade_checkins: RowOps<CascadeCheckin>;
      cascade_checkin_goals: RowOps<CascadeCheckinGoal>;
      inspection_questions: RowOps<InspectionQuestion>;
      inspections: RowOps<Inspection>;
      review_queue_items: RowOps<ReviewQueueItem>;
      journal_entries: RowOps<JournalEntry>;
      daily_habits: RowOps<DailyHabit>;
      habit_checks: RowOps<HabitCheck>;
      cohorts: RowOps<Cohort>;
      mentors: RowOps<Mentor>;
      cohort_sessions: RowOps<CohortSession>;
      cohort_participants: {
        Row: CohortParticipant;
        Insert: Omit<CohortParticipant, "id" | "applied_at"> &
          Partial<Pick<CohortParticipant, "id" | "applied_at">>;
        Update: Partial<CohortParticipant>;
        Relationships: [];
      };
      cohort_waitlist: RowOps<CohortWaitlistEntry>;
      office_hours_bookings: RowOps<OfficeHoursBooking>;
      session_attendance: RowOps<SessionAttendance>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
