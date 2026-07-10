import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import { reflectionForDay } from "@/lib/prompts/reflection";
import { todayInTimezone, weekdayInTimezone } from "@/lib/utils";
import type {
  DailyCheckin,
  DailyHabit,
  HabitCheck,
  Profile,
} from "@/lib/database.types";
import { CheckinForm } from "./checkin-form";
import { HabitChecklist } from "./habit-checklist";
import { SabbathReflection } from "./sabbath-reflection";

export default async function CheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) redirect("/onboarding");

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  if (profile.sabbath_day === weekday) {
    // Sabbath is a reflection day, not a pause. Show the reflection instead of
    // the coaching check-in.
    return (
      <SabbathReflection
        dayLabel={profile.sabbath_day}
        prompt={reflectionForDay(today, user.id)}
        name={profile.name}
      />
    );
  }

  const [{ data: existingRow }, { data: habitsData }, { data: checksData }] =
    await Promise.all([
      supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("checkin_date", today)
        .maybeSingle(),
      supabase
        .from("daily_habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_checks")
        .select("habit_id")
        .eq("user_id", user.id)
        .eq("check_date", today),
    ]);
  const existing = existingRow as DailyCheckin | null;
  const habits = (habitsData ?? []) as DailyHabit[];
  const checkedIds = ((checksData ?? []) as Pick<HabitCheck, "habit_id">[]).map(
    (c) => c.habit_id,
  );

  const promptText =
    existing?.prompt_text ??
    promptForDay(profile.current_phase, today, user.id);

  return (
    <div className="space-y-4">
      {/* Small no-writing daily goals — check and move on. */}
      <div className="px-3 pt-6">
        <HabitChecklist habits={habits} checkedIds={checkedIds} today={today} />
      </div>

      <CheckinForm
        checkinDate={today}
        promptText={promptText}
        existingResponse={existing?.user_response ?? null}
        existingCoaching={existing?.ai_coaching ?? null}
        existingPhase={existing?.framework_phase ?? null}
        existingTags={existing?.tags ?? null}
      />
    </div>
  );
}
