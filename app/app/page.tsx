import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { Reveal, Stagger, StaggerItem } from "@/lib/motion";
import { createClient } from "@/lib/supabase/server";
import { promptForDay } from "@/lib/prompts/daily";
import { reflectionForDay } from "@/lib/prompts/reflection";
import { stuckAcrossTwo } from "@/lib/inspection/context";
import { principleByKey } from "@/lib/inspection/principles";
import type { TrajectoryRead } from "@/lib/inspection/scoring";
import {
  todayInTimezone,
  weekdayInTimezone,
  weekStartFor,
} from "@/lib/utils";
import type {
  DailyCheckin,
  DailyHabit,
  FrameworkPhase,
  GrowthGoal,
  HabitCheck,
  Profile,
  Situation,
} from "@/lib/database.types";
import { CheckinForm } from "./checkin/checkin-form";
import { TodayBoards } from "./today-boards";
import { autoParentId } from "./plan/house/progress";
import { HabitChecklist } from "./checkin/habit-checklist";

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
  const checkoutSuccess = params.checkout === "success";
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

  // Funnel bridge: a brand-new user with no blueprint should be guided to build
  // one, not stranded on Today (docs/PLAN_HOUSE_UX_FLOW.md).
  const { data: planRow } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  const hasPlan = !!planRow;

  const today = todayInTimezone(profile.timezone);
  const weekday = weekdayInTimezone(profile.timezone);
  const onSabbath = profile.sabbath_day === weekday;

  const [
    { data: todayRow },
    { data: habitsData },
    { data: checksData },
    { data: goalsData },
  ] = await Promise.all([
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
      supabase
        .from("growth_goals")
        .select("id, body, status, level, created_at, updated_at")
        .eq("user_id", user.id)
        .in("level", ["daily", "weekly"])
        .neq("status", "dropped")
        .order("created_at", { ascending: true }),
    ]);
  const todayCheckin = todayRow as DailyCheckin | null;
  const habits = (habitsData ?? []) as DailyHabit[];
  const checkedIds = ((checksData ?? []) as Pick<HabitCheck, "habit_id">[]).map(
    (c) => c.habit_id,
  );
  const planGoals = (goalsData ?? []) as GrowthGoal[];
  // Today's boards: open dailies plus any completed today (momentum stays
  // visible; yesterday's finished work doesn't clutter the morning).
  const boards = planGoals
    .filter((g) => g.level === "daily")
    .filter(
      (g) =>
        g.status === "open" ||
        (g.status === "done" && (g.updated_at ?? "").slice(0, 10) >= today),
    )
    .map((g) => ({ id: g.id, body: g.body, status: g.status }));
  const boardParentId = autoParentId("daily", planGoals);

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

  // Inspection nudge: a principle stuck across the last two inspections is the
  // "needs a human" signal.
  const { data: recentInspections } = await supabase
    .from("inspections")
    .select("trajectory_read, cycle_number")
    .eq("user_id", user.id)
    .not("sent_at", "is", null)
    .order("cycle_number", { ascending: false })
    .limit(2);
  const insp = (recentInspections ?? []) as {
    trajectory_read: TrajectoryRead | null;
  }[];
  const stuckPrinciples = stuckAcrossTwo(
    insp[0]?.trajectory_read ?? null,
    insp[1]?.trajectory_read ?? null,
  ).map((p) => principleByKey(p).name);

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
      {checkoutSuccess ? (
        <div className="mx-3 rounded-md border border-moss bg-moss-wash p-4">
          <p className="type-cap text-moss">SUBSCRIPTION ACTIVE</p>
          <p className="type-body-sm mt-1 text-ink2">
            You&apos;re locked in. The site stays open as long as you
            keep building.
          </p>
        </div>
      ) : null}
      <header className="px-3">
        <p className="type-cap text-graphite">{dayLabel}</p>
        <h1 className="type-h1 mt-2 text-ink">
          {profile.name ? `Morning, ${profile.name}.` : "Welcome back."}
        </h1>
      </header>

      {!hasPlan ? (
        <Reveal as="panelRise" className="mx-3">
          <Link
            href="/app/plan"
            className="block overflow-hidden rounded-lg border border-oak bg-oak-wash p-5 transition-colors hover:bg-oak/20"
          >
            <p className="type-cap text-oak-dim">START HERE · YOUR BLUEPRINT</p>
            <h2 className="type-h2 mt-1.5 text-ink">Draw your blueprint first.</h2>
            <p className="type-body-sm mt-1.5 text-graphite">
              Foreman measures today&apos;s work against where you said you want
              to go. Three minutes to lay the foundation — then your house starts
              rising.
            </p>
            <span className="type-label mt-3 inline-flex items-center gap-1 text-oak-dim">
              Build your house <ArrowIcon size={14} />
            </span>
          </Link>
        </Reveal>
      ) : null}

      {/* Daily habits — right here on Home, check and move on. */}
      <div className="mx-3">
        <HabitChecklist habits={habits} checkedIds={checkedIds} today={today} />
      </div>

      {onSabbath ? (
        <Card className="mx-3 p-5">
          <p className="type-cap text-oak-dim">
            SABBATH · {profile.sabbath_day.toUpperCase()}
          </p>
          <h2 className="type-h2 mt-2 text-ink">A day set apart.</h2>
          <p className="type-body mt-2 text-graphite">
            No check-in today. A day for reflection, faith, and growth — a
            chance to step back into something bigger than the work.
          </p>
          <p className="type-prompt mt-4 text-ink">
            {reflectionForDay(today, user.id)}
          </p>
        </Card>
      ) : (
        <>
          {/* Morning check-in hero — scrolls to the check-in right below. */}
          <a
            href="#daily-checkin"
            className="group relative mx-3 block overflow-hidden rounded-xl shadow-lift"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/house-hero.png"
              alt=""
              className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.02_55/0.82)] via-[oklch(0.25_0.02_55/0.28)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <div>
                <p className="type-cap text-[#e6b25a]">
                  TODAY&apos;S FOCUS{checkinDone ? " · FILED" : ""}
                </p>
                <p className="type-h2 mt-1 text-[oklch(0.98_0.01_80)]">
                  Morning check-in
                </p>
                <p className="type-caption mt-0.5 text-[oklch(0.98_0.01_80/0.7)]">
                  {checkinDone
                    ? "Done — your coaching is below."
                    : "2 min · under construction, every day"}
                </p>
              </div>
              <span className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.98_0.01_80)] text-ink transition-transform group-hover:translate-y-0.5">
                <ArrowIcon size={16} />
              </span>
            </div>
          </a>

          {/* The daily check-in itself — boards first, then the reflection.
              One ritual: check the work, then talk about it. */}
          <section id="daily-checkin" className="scroll-mt-16 space-y-4">
            <div className="mx-3">
              <TodayBoards boards={boards} autoParentId={boardParentId} />
            </div>
            <CheckinForm
              checkinDate={today}
              promptText={promptText}
              existingResponse={todayCheckin?.user_response ?? null}
              existingCoaching={todayCheckin?.ai_coaching ?? null}
              existingPhase={todayCheckin?.framework_phase ?? null}
              existingTags={todayCheckin?.tags ?? null}
            />
          </section>
        </>
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

      {stuckPrinciples.length ? (
        <Card className="mx-3 p-5">
          <p className="type-cap text-oak-dim">STILL STANDING IN THE SAME SPOT</p>
          <h3 className="type-h2 mt-2 text-ink">
            {stuckPrinciples.join(" and ")} hasn&apos;t moved in two inspections.
          </h3>
          <p className="type-body mt-2 text-graphite">
            A whole cycle in the same place is exactly when a real conversation
            helps more than another prompt. It may be time to sit down with
            someone on this one.
          </p>
        </Card>
      ) : null}

      {/* Stats grid */}
      <Stagger className="mx-3 grid grid-cols-2 gap-2.5">
        <StaggerItem>
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
        </StaggerItem>
        <StaggerItem>
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
        </StaggerItem>
      </Stagger>

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
        <Reveal as="boardUp" className="mx-3 space-y-2 pb-4">
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
                          ? "#b26a45"
                          : p === "framing"
                            ? "#b26a45"
                            : "#5f7d69",
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
        </Reveal>
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
