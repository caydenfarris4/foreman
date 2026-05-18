import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import {
  todayInTimezone,
  weekdayInTimezone,
  weekStartFor,
} from "@/lib/utils";
import type {
  DailyCheckin,
  FrameworkPhase,
  Profile,
  Situation,
} from "@/lib/database.types";

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function siteDaysThisMonth(
  dates: { checkin_date: string; completed_at: string | null }[],
  todayISO: string,
): { logged: number; daysInMonth: number; dayOfMonth: number } {
  const today = new Date(`${todayISO}T00:00:00Z`);
  const dayOfMonth = today.getUTCDate();
  const monthStart = `${todayISO.slice(0, 7)}-01`;
  const logged = dates.filter(
    (d) =>
      d.completed_at &&
      d.checkin_date >= monthStart &&
      d.checkin_date <= todayISO,
  ).length;
  const daysInMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return { logged, daysInMonth, dayOfMonth };
}

function daysUntilWeekday(targetWeekday: string, tz: string): number {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const target = dayMap[targetWeekday] ?? 0;
  const today = new Date();
  const todayWeekday = new Date(
    today.toLocaleString("en-US", { timeZone: tz }),
  ).getDay();
  return (target - todayWeekday + 7) % 7;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkoutFlag = params.checkout;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) return null;

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  const onSabbath = profile.sabbath_day === weekday;

  const { data: todayRow } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();
  const todayCheckin = todayRow as DailyCheckin | null;

  const { data: monthCheckinsData } = await supabase
    .from("daily_checkins")
    .select("checkin_date, completed_at")
    .eq("user_id", user.id)
    .gte("checkin_date", `${today.slice(0, 7)}-01`);
  const monthCheckins = (monthCheckinsData ?? []) as {
    checkin_date: string;
    completed_at: string | null;
  }[];

  const { data: recentRow } = await supabase
    .from("situations")
    .select("id, title, framework_phase, tags, coaching, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const recentSituation = recentRow as Pick<
    Situation,
    "id" | "title" | "framework_phase" | "tags" | "coaching" | "created_at"
  > | null;

  // Phase counts for the build strip.
  const phases: FrameworkPhase[] = ["foundation", "framing", "finishing"];
  const phaseCounts = await Promise.all(
    phases.map((p) =>
      supabase
        .from("situations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("framework_phase", p),
    ),
  );
  const counts: Record<FrameworkPhase, number> = {
    foundation: phaseCounts[0].count ?? 0,
    framing: phaseCounts[1].count ?? 0,
    finishing: phaseCounts[2].count ?? 0,
  };
  const totalSituations = counts.foundation + counts.framing + counts.finishing;

  const todaysPrompt = promptForDay(profile.current_phase, today, user.id);

  // Retro state.
  const currentWeekStart = weekStartFor(today);
  const { data: retroRow } = await supabase
    .from("weekly_retros")
    .select("ai_synthesis")
    .eq("user_id", user.id)
    .eq("week_start", currentWeekStart)
    .maybeSingle();
  const retroDone = !!(retroRow as { ai_synthesis: string | null } | null)
    ?.ai_synthesis;
  const isRetroDay = weekday === profile.retro_day && !onSabbath;
  const daysToRetro = daysUntilWeekday(profile.retro_day, profile.timezone);

  const { logged, daysInMonth, dayOfMonth } = siteDaysThisMonth(
    monthCheckins,
    today,
  );
  const monthName = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  const dayLabel = new Date(`${today}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();

  const checkinDone = !!todayCheckin?.completed_at;
  const promptText = todayCheckin?.prompt_text ?? todaysPrompt;

  return (
    <div className="space-y-4 px-1 pt-4">
      {checkoutFlag === "success" || checkoutFlag === "cohort_success" ? (
        <div className="mx-3 rounded-md border border-moss bg-moss-wash p-4">
          <p className="type-cap text-moss">
            {checkoutFlag === "cohort_success"
              ? "COHORT PAYMENT CONFIRMED"
              : "SUBSCRIPTION ACTIVE"}
          </p>
          <p className="type-body-sm mt-1 text-ink2">
            {checkoutFlag === "cohort_success"
              ? "You're enrolled. Watch your email for the cohort welcome packet — schedule, prep materials, and how to show up to session 01."
              : "You're locked in. The site stays open as long as you keep building."}
          </p>
        </div>
      ) : null}
      <header className="px-3">
        <p className="type-cap text-graphite">{dayLabel}</p>
        <h1 className="type-h1 mt-2 text-ink">
          {profile.name ? `Morning, ${profile.name}.` : "Welcome back."}
        </h1>
      </header>

      {onSabbath ? (
        <Card className="mx-3 p-5">
          <p className="type-cap text-oak-dim">
            REST DAY · {profile.sabbath_day.toUpperCase()}
          </p>
          <h2 className="type-h2 mt-2 text-ink">
            Foreman is paused today.
          </h2>
          <p className="type-body mt-2 text-graphite">
            You chose {profile.sabbath_day} as your rest day. Take it. The
            site will be here tomorrow.
          </p>
        </Card>
      ) : (
        <div className="mx-3 overflow-hidden rounded-lg bg-ink p-5 text-chalk">
          <div className="mb-3 flex items-center justify-between">
            <span className="type-cap text-chalk/55">TODAY · CHECK-IN</span>
            <span className="type-cap text-oak">
              {checkinDone ? "FILED" : "NOT YET"}
            </span>
          </div>
          <p className="type-prompt mb-5 text-chalk">{promptText}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="type-caption text-chalk/55">
              {checkinDone ? "Your coaching is below." : "Under 5 minutes."}
            </span>
            <Button asChild size="md" variant="oak">
              <Link href="/app/checkin">
                {checkinDone ? "Open" : "Start"}
                <ArrowIcon />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {isRetroDay && !retroDone ? (
        <Card className="mx-3 p-5">
          <p className="type-cap text-oak-dim">RETRO DAY</p>
          <h3 className="type-h2 mt-2 text-ink">
            Your weekly retro is ready.
          </h3>
          <p className="type-body mt-2 text-graphite">
            Twenty minutes. Wins, struggles, lessons. The site report lands
            the moment you submit it.
          </p>
          <div className="mt-4">
            <Button asChild size="md">
              <Link href="/app/retro">
                Open retro
                <ArrowIcon />
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Stats grid */}
      <div className="mx-3 grid grid-cols-2 gap-2.5">
        <Card className="p-4">
          <p className="type-cap text-graphite">
            SITE DAYS · {monthName.toUpperCase()}
          </p>
          <p className="type-h1 mt-2 text-ink">
            {logged}
            <span className="type-spec text-graphite"> / {dayOfMonth}</span>
          </p>
          <p className="type-caption mt-1 text-graphite">
            {dayOfMonth} day{dayOfMonth === 1 ? "" : "s"} into {monthName}.
          </p>
        </Card>
        <Card className="p-4">
          <p className="type-cap text-graphite">NEXT RETRO</p>
          <p className="type-h1 mt-2 text-ink">
            {retroDone
              ? "Filed"
              : daysToRetro === 0
                ? "Today"
                : capitalize(profile.retro_day.slice(0, 3))}
            {!retroDone && daysToRetro > 0 ? (
              <span className="type-spec text-graphite">
                {" "}
                · {daysToRetro}d
              </span>
            ) : null}
          </p>
          <p className="type-caption mt-1 text-graphite">
            {retroDone
              ? "This week is done."
              : `Set for ${capitalize(profile.retro_day)}.`}
          </p>
        </Card>
      </div>

      {/* Recent insight */}
      {recentSituation ? (
        <div className="mx-3 space-y-2">
          <p className="type-cap text-graphite">STILL CHEWING</p>
          <Link
            href={`/app/library/${recentSituation.id}`}
            className="block rounded-lg border border-rule bg-chalk p-4 transition-colors hover:bg-paper2/40"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PhaseTag phase={recentSituation.framework_phase} />
              {(recentSituation.tags ?? []).slice(0, 2).map((t) => (
                <Badge key={t} variant="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
            <p className="type-body-lg text-ink">
              {firstSentence(recentSituation.coaching)}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="type-caption text-graphite">
                {recentSituation.title}
              </span>
              <span className="type-label flex items-center gap-1 text-ink2">
                Open <ArrowIcon size={14} />
              </span>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Phase build strip */}
      {totalSituations > 0 ? (
        <div className="mx-3 space-y-2 pb-4">
          <p className="type-cap text-graphite">YOUR BUILD</p>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {phases.map((p) => (
                <Link
                  key={p}
                  href={`/app/library?phase=${p}`}
                  className="block"
                >
                  <div
                    className="mb-2 h-[3px]"
                    style={{
                      backgroundColor:
                        p === "foundation"
                          ? "#1E3A5F"
                          : p === "framing"
                            ? "#B8843F"
                            : "#4A6B3A",
                    }}
                  />
                  <p className="type-h2 text-[22px] leading-none text-ink">
                    {counts[p]}
                  </p>
                  <p className="type-cap mt-1 text-graphite">{p}</p>
                </Link>
              ))}
            </div>
            <p className="type-caption mt-3 border-t border-rule pt-3 text-graphite">
              {phaseSummary(counts)}
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function firstSentence(s: string): string {
  const match = s.match(/^(.{20,200}?[.!?])(\s|$)/);
  return (match ? match[1] : s).trim();
}

function phaseSummary(counts: Record<FrameworkPhase, number>): string {
  const total = counts.foundation + counts.framing + counts.finishing;
  if (total === 0) return "Your first check-in will start filling this in.";
  const max = Math.max(counts.foundation, counts.framing, counts.finishing);
  const dominant = (Object.entries(counts) as [FrameworkPhase, number][])
    .find(([, n]) => n === max)?.[0] ?? "framing";
  const explainer: Record<FrameworkPhase, string> = {
    foundation:
      "Most of your sessions sit in foundation. That tracks — self-leadership is where the heavy work hides.",
    framing:
      "Most of your sessions sit in framing. That tracks — team mechanics get loud in the first year.",
    finishing:
      "Most of your sessions sit in finishing. That tracks — culture and refinement is where the long game lives.",
  };
  return explainer[dominant];
}
