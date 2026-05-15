import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  retroDayForSabbath,
  todayInTimezone,
  weekStartFor,
  weekdayInTimezone,
} from "@/lib/utils";
import { RetroForm } from "./retro-form";

type SearchParams = { week?: string };

export default async function RetroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
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
  const retroDay = retroDayForSabbath(profile.sabbath_day);
  const isRetroDay = weekday === retroDay;

  // Default to the week that just ended (the Monday on or before today,
  // which represents the current ISO week's start). On retro day this is
  // the week the user is reflecting on; outside retro day, they can still
  // open the page to write/edit.
  const weekStart = params.week ?? weekStartFor(today);

  const { data: existing } = await supabase
    .from("weekly_retros")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const e = existing as
    | {
        wins: string | null;
        struggles: string | null;
        lessons: string | null;
        ai_synthesis: string | null;
        framework_focus: string | null;
      }
    | null;

  // Pull the week's check-ins for context (read-only display).
  const weekEnd = new Date(`${weekStart}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const { data: weekCheckins } = await supabase
    .from("daily_checkins")
    .select("checkin_date, prompt_text, framework_phase")
    .eq("user_id", user.id)
    .gte("checkin_date", weekStart)
    .lte("checkin_date", weekEndISO)
    .order("checkin_date", { ascending: true });

  const checkins = (weekCheckins ?? []) as {
    checkin_date: string;
    prompt_text: string;
    framework_phase: string | null;
  }[];

  return (
    <div className="container max-w-2xl py-10">
      <RetroForm
        weekStart={weekStart}
        weekEnd={weekEndISO}
        isRetroDay={isRetroDay}
        retroDay={retroDay}
        existingWins={e?.wins ?? ""}
        existingStruggles={e?.struggles ?? ""}
        existingLessons={e?.lessons ?? ""}
        existingSynthesis={e?.ai_synthesis ?? null}
        existingFocus={e?.framework_focus ?? null}
        weekCheckins={checkins}
      />
    </div>
  );
}
