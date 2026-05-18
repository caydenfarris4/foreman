// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
