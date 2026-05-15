import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import { todayInTimezone, weekdayInTimezone } from "@/lib/utils";
import { CheckinForm } from "./checkin-form";

export default async function CheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/onboarding");

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  if (profile.sabbath_day === weekday) {
    redirect("/app");
  }

  const { data: existing } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();

  const promptText =
    existing?.prompt_text ??
    promptForDay(profile.current_phase, today, user.id);

  return (
    <div className="container max-w-2xl py-10">
      <CheckinForm
        checkinDate={today}
        promptText={promptText}
        existingResponse={existing?.user_response ?? null}
        existingCoaching={existing?.ai_coaching ?? null}
      />
    </div>
  );
}
