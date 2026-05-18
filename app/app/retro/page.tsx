import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  todayInTimezone,
  weekStartFor,
  weekdayInTimezone,
} from "@/lib/utils";
import type { Profile, WeeklyRetro } from "@/lib/database.types";
import { isIsoDate } from "@/lib/validation";
import { RetroForm } from "./retro-form";
import { SkipWeekButton } from "./skip-button";

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

  const weekStart = isIsoDate(params.week) ? params.week : weekStartFor(today);

  const { data: existing } = await supabase
    .from("weekly_retros")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const e = existing as Pick<
    WeeklyRetro,
    | "wins"
    | "struggles"
    | "lessons"
    | "ai_synthesis"
    | "framework_focus"
    | "skipped"
  > | null;

  // Carry-over: surface the previous week's struggle + lesson so the
  // manager can answer "how did that go" instead of starting cold.
  const previousWeekStart = previousWeek(weekStart);
  const { data: previousRow } = await supabase
    .from("weekly_retros")
    .select("week_start, struggles, lessons, framework_focus")
    .eq("user_id", user.id)
    .eq("week_start", previousWeekStart)
    .maybeSingle();
  const previous = previousRow as Pick<
    WeeklyRetro,
    "week_start" | "struggles" | "lessons" | "framework_focus"
  > | null;

  // Week range.
  const weekEnd = new Date(`${weekStart}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);
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

  if (e?.skipped) {
    return (
      <div className="space-y-4 px-3 pb-8 pt-6">
        <div className="px-1">
          <p className="type-cap text-graphite">
            WEEK {String(weekNumber).padStart(2, "0")} · SKIPPED
          </p>
          <h1 className="type-h1 mt-2 text-ink">This week is off.</h1>
          <p className="type-body mt-3 text-graphite">
            No retro for this week. The cadence picks up again next week
            — or you can change your mind below.
          </p>
        </div>
        <SkipWeekButton weekStart={weekStart} isSkipped={true} />
        <div className="pt-2">
          <Link
            href="/app/retro/history"
            className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
          >
            See all retros →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-8 pt-4">
      {previous && (previous.struggles || previous.lessons) ? (
        <PreviousWeekCallout previous={previous} />
      ) : null}

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

      {/* Skip + history footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <SkipWeekButton weekStart={weekStart} isSkipped={false} />
        <Link
          href="/app/retro/history"
          className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
        >
          See all retros →
        </Link>
      </div>
    </div>
  );
}

function PreviousWeekCallout({
  previous,
}: {
  previous: { week_start: string; struggles: string | null; lessons: string | null };
}) {
  return (
    <details className="rounded-md border border-rule bg-paper2/40 px-4 py-3">
      <summary className="type-cap cursor-pointer text-graphite">
        FROM LAST WEEK · CARRY-OVER
      </summary>
      <div className="mt-3 space-y-2">
        {previous.struggles ? (
          <div>
            <p className="type-cap text-graphite">YOU STRUGGLED WITH</p>
            <p className="type-body-sm mt-1 whitespace-pre-wrap text-ink2">
              {previous.struggles}
            </p>
          </div>
        ) : null}
        {previous.lessons ? (
          <div>
            <p className="type-cap text-graphite">YOU LEARNED</p>
            <p className="type-body-sm mt-1 whitespace-pre-wrap text-ink2">
              {previous.lessons}
            </p>
          </div>
        ) : null}
        <p className="type-caption text-graphite">
          How did that go this week? Write it into your wins or
          struggles below.
        </p>
      </div>
    </details>
  );
}

function previousWeek(weekStartISO: string): string {
  const d = new Date(`${weekStartISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
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
