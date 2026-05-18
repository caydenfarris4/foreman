import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  todayInTimezone,
  weekStartFor,
  weekdayInTimezone,
} from "@/lib/utils";
import type { Profile } from "@/lib/database.types";
import { isIsoDate } from "@/lib/validation";
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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) redirect("/onboarding");

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  const isRetroDay = weekday === profile.retro_day;

  // ?week= must be ISO date or we fall back. Don't let arbitrary input
  // reach the DB or the Date constructor.
  const weekStart = isIsoDate(params.week) ? params.week : weekStartFor(today);

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

  // Week range.
  const weekEnd = new Date(`${weekStart}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  // Week number (ISO week).
  const weekNumber = isoWeek(new Date(`${weekStart}T00:00:00Z`));

  const { data: weekCheckins } = await supabase
    .from("daily_checkins")
    .select("checkin_date, prompt_text, framework_phase, ai_coaching")
    .eq("user_id", user.id)
    .gte("checkin_date", weekStart)
    .lte("checkin_date", weekEndISO)
    .order("checkin_date", { ascending: true });

  const checkins = (weekCheckins ?? []) as {
    checkin_date: string;
    prompt_text: string;
    framework_phase: string | null;
    ai_coaching: string | null;
  }[];

  return (
    <div className="px-3 pb-8 pt-4">
      <RetroForm
        weekStart={weekStart}
        weekEnd={weekEndISO}
        weekNumber={weekNumber}
        isRetroDay={isRetroDay}
        retroDay={profile.retro_day}
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

function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
