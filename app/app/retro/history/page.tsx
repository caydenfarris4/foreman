import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import type {
  FrameworkPhase,
  MonthlySynthesis,
  WeeklyRetro,
} from "@/lib/database.types";
import { MonthlyTrigger } from "./monthly-trigger";

const PAGE_SIZE = 24;

function isPhase(value: string | null): value is FrameworkPhase {
  return value === "foundation" || value === "framing" || value === "finishing";
}

export default async function RetroHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: retroRows } = await supabase
    .from("weekly_retros")
    .select(
      "id, week_start, ai_synthesis, framework_focus, wins, struggles, lessons, skipped",
    )
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(PAGE_SIZE);
  const retros = (retroRows ?? []) as Pick<
    WeeklyRetro,
    | "id"
    | "week_start"
    | "ai_synthesis"
    | "framework_focus"
    | "wins"
    | "struggles"
    | "lessons"
    | "skipped"
  >[];

  // Group by month for the monthly-synthesis trigger.
  const monthly = new Map<
    string,
    { retros: number; completed: number }
  >();
  for (const r of retros) {
    const monthKey = r.week_start.slice(0, 7) + "-01";
    const bucket = monthly.get(monthKey) ?? { retros: 0, completed: 0 };
    bucket.retros += 1;
    if (!r.skipped && r.ai_synthesis) bucket.completed += 1;
    monthly.set(monthKey, bucket);
  }

  const monthsWithEnough = [...monthly.entries()]
    .filter(([, v]) => v.completed >= 4)
    .map(([k]) => k);

  // Pull any cached monthly syntheses we already have.
  const { data: monthlyRows } =
    monthsWithEnough.length > 0
      ? await supabase
          .from("monthly_syntheses")
          .select("month_start, ai_summary, framework_focus, retro_count")
          .eq("user_id", user.id)
          .in("month_start", monthsWithEnough)
      : { data: [] as MonthlySynthesis[] };
  const monthlyCached = new Map<
    string,
    Pick<
      MonthlySynthesis,
      "ai_summary" | "framework_focus" | "retro_count"
    >
  >();
  for (const m of (monthlyRows ?? []) as MonthlySynthesis[]) {
    monthlyCached.set(m.month_start, {
      ai_summary: m.ai_summary,
      framework_focus: m.framework_focus,
      retro_count: m.retro_count,
    });
  }

  return (
    <div className="px-3 pb-8 pt-4">
      <div className="px-1">
        <p className="type-cap text-graphite">RETRO HISTORY</p>
        <h1 className="type-h1 mt-2 text-ink">Every week, on the record.</h1>
        <p className="type-body mt-3 text-graphite">
          Newest first. Click a week to read or update it. Once you have
          four completed retros in a month, the pattern synthesis becomes
          available.
        </p>
      </div>

      {monthsWithEnough.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="type-cap text-graphite">MONTHLY SYNTHESIS</p>
          {monthsWithEnough.map((monthStart) => {
            const cached = monthlyCached.get(monthStart);
            const bucket = monthly.get(monthStart);
            const monthLabel = new Date(
              `${monthStart}T12:00:00Z`,
            ).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            });
            return (
              <div
                key={monthStart}
                className="rounded-lg border border-rule bg-chalk p-5"
              >
                <div className="flex items-baseline justify-between">
                  <p className="type-h2 text-ink">{monthLabel}</p>
                  <span className="type-cap text-graphite">
                    {bucket?.completed ?? 0} RETROS
                  </span>
                </div>
                {cached ? (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      {isPhase(cached.framework_focus) ? (
                        <PhaseTag phase={cached.framework_focus} />
                      ) : null}
                      <Badge variant="neutral" size="sm">
                        {cached.retro_count} weeks
                      </Badge>
                    </div>
                    <p className="type-body mt-3 whitespace-pre-wrap text-ink2">
                      {cached.ai_summary}
                    </p>
                  </>
                ) : (
                  <MonthlyTrigger monthStart={monthStart} />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8 space-y-2">
        <p className="type-cap text-graphite">ALL WEEKS</p>
        {retros.length === 0 ? (
          <p className="type-body text-graphite">
            No retros yet.{" "}
            <Link href="/app/retro" className="underline">
              Write your first.
            </Link>
          </p>
        ) : (
          retros.map((r) => <RetroRow key={r.id} r={r} />)
        )}
      </div>
    </div>
  );
}

function RetroRow({
  r,
}: {
  r: Pick<
    WeeklyRetro,
    | "id"
    | "week_start"
    | "ai_synthesis"
    | "framework_focus"
    | "wins"
    | "struggles"
    | "lessons"
    | "skipped"
  >;
}) {
  const start = new Date(`${r.week_start}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const range = `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })} – ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;

  const preview =
    r.ai_synthesis?.slice(0, 220) ??
    [r.wins, r.struggles, r.lessons]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220);

  return (
    <Link
      href={`/app/retro?week=${r.week_start}`}
      className="block rounded-md border border-rule bg-chalk p-4 transition-colors hover:bg-paper2/40"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-label text-ink">{range}</p>
        <div className="flex items-center gap-2">
          {r.skipped ? (
            <Badge variant="neutral" size="sm">
              Skipped
            </Badge>
          ) : r.ai_synthesis ? (
            isPhase(r.framework_focus) ? (
              <PhaseTag phase={r.framework_focus} />
            ) : null
          ) : (
            <Badge variant="neutral" size="sm">
              Draft
            </Badge>
          )}
        </div>
      </div>
      {preview ? (
        <p className="type-body-sm mt-2 line-clamp-2 text-graphite">
          {preview}
        </p>
      ) : null}
    </Link>
  );
}
