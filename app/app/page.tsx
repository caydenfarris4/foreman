import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import {
  retroDayForSabbath,
  todayInTimezone,
  weekStartFor,
  weekdayInTimezone,
} from "@/lib/utils";

function computeStreak(
  dates: { checkin_date: string; completed_at: string | null }[],
  todayISO: string,
  sabbathDay: string,
): number {
  // Most recent completed first.
  const completed = new Set(
    dates.filter((d) => d.completed_at).map((d) => d.checkin_date),
  );
  let streak = 0;
  const cursor = new Date(`${todayISO}T00:00:00Z`);
  // Loop backward; sabbath days don't break the streak.
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = cursor
      .toLocaleString("en-US", { weekday: "long", timeZone: "UTC" })
      .toLowerCase();
    if (weekday === sabbathDay) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    if (completed.has(iso)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  const onSabbath = profile.sabbath_day === weekday;

  const { data: todayCheckin } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();

  const { data: recentCheckins } = await supabase
    .from("daily_checkins")
    .select("checkin_date, completed_at")
    .eq("user_id", user.id)
    .order("checkin_date", { ascending: false })
    .limit(60);

  const { data: recentSituation } = await supabase
    .from("situations")
    .select("id, title, framework_phase, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const streak = computeStreak(
    recentCheckins ?? [],
    today,
    profile.sabbath_day,
  );

  const todaysPrompt = promptForDay(profile.current_phase, today, user.id);

  const retroDay = retroDayForSabbath(profile.sabbath_day);
  const isRetroDay = weekday === retroDay && !onSabbath;
  const currentWeekStart = weekStartFor(today);
  const { data: thisWeeksRetro } = await supabase
    .from("weekly_retros")
    .select("ai_synthesis")
    .eq("user_id", user.id)
    .eq("week_start", currentWeekStart)
    .maybeSingle();
  const retroDone = !!(thisWeeksRetro as { ai_synthesis: string | null } | null)
    ?.ai_synthesis;

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          {profile.name ? `Morning, ${profile.name}.` : "Welcome back."}
        </h1>
      </div>

      {onSabbath ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Foreman is paused today.
            </CardTitle>
            <CardDescription>
              You chose {profile.sabbath_day} as your rest day. Take it. The
              site will be here tomorrow.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Today's question
            </CardTitle>
            <CardDescription>
              {todayCheckin?.completed_at
                ? "You answered this one. The coaching is in your library."
                : "Five minutes. One question. Then coaching back."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-serif text-xl leading-relaxed">
              {todayCheckin?.prompt_text ?? todaysPrompt}
            </p>
            <Button asChild>
              <Link href="/app/checkin">
                {todayCheckin?.completed_at ? "View today's coaching" : "Open check-in"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isRetroDay && !retroDone ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Your weekly retro is ready.
            </CardTitle>
            <CardDescription>
              Twenty minutes. Wins, struggles, lessons. The synthesis lands the
              moment you submit it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/retro">Open retro</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Current streak</CardDescription>
            <CardTitle className="font-serif text-4xl tabular-nums">
              {streak} <span className="text-base text-muted-foreground">day{streak === 1 ? "" : "s"}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Most recent insight</CardDescription>
            <CardTitle className="font-serif text-base leading-snug">
              {recentSituation ? (
                <Link
                  href={`/app/library/${recentSituation.id}`}
                  className="hover:underline"
                >
                  {recentSituation.title}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  Your first check-in will create your first situation.
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
