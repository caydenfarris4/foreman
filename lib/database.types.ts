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
  current_role: string | null;
  promoted_at: string | null;
  team_size: number | null;
  team_context: string | null;
  industry: string | null;
  current_challenge: string | null;
  current_phase: FrameworkPhase;
  sabbath_day: SabbathDay;
  notification_time: string;
  timezone: string;
  onboarded_at: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  trial_ends_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
