import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import { reflectionForDay } from "@/lib/prompts/reflection";
import { todayInTimezone, weekdayInTimezone } from "@/lib/utils";
import type { DailyCheckin, Profile } from "@/lib/database.types";
import { CheckinForm } from "./checkin-form";
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

  const { data: existingRow } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();
  const existing = existingRow as DailyCheckin | null;

  const promptText =
    existing?.prompt_text ??
    promptForDay(profile.current_phase, today, user.id);

  return (
    <CheckinForm
      checkinDate={today}
      promptText={promptText}
      existingResponse={existing?.user_response ?? null}
      existingCoaching={existing?.ai_coaching ?? null}
      existingPhase={existing?.framework_phase ?? null}
      existingTags={existing?.tags ?? null}
    />
  );
}
