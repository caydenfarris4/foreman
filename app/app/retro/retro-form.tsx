"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhaseTag } from "@/components/ui/phase-tag";
import { cn } from "@/lib/utils";

interface WeekCheckin {
  checkin_date: string;
  prompt_text: string;
  framework_phase: string | null;
  ai_coaching: string | null;
}

interface Props {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  isRetroDay: boolean;
  retroDay: string;
  existingWins: string;
  existingStruggles: string;
  existingLessons: string;
  existingSynthesis: string | null;
  existingFocus: string | null;
  weekCheckins: WeekCheckin[];
}

const STEPS = [
  {
    id: "wins",
    eyebrow: "WK · WINS",
    n: "01",
    title: "What landed?",
    sub: "Even the small ones. Especially the small ones.",
    placeholder:
      "The 1:1 you didn't avoid. The hire who's settling in. The decision that turned out cleaner than it looked.",
  },
  {
    id: "struggles",
    eyebrow: "WK · STRUGGLES",
    n: "02",
    title: "What hurt?",
    sub: "The thing you reacted to. The one you avoided. The one you carried home.",
    placeholder:
      "Be specific. 'I snapped at Priya in standup' beats 'team friction.'",
  },
  {
    id: "lessons",
    eyebrow: "WK · LESSONS",
    n: "03",
    title: "What did you learn this week?",
    sub: "One sentence is fine. The honest one is better than the polished one.",
    placeholder:
      "I keep thinking my job is to be useful in every meeting. The conversation taught me the opposite — sometimes my job is to be absent on purpose.",
  },
] as const;

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

function BackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 10H4M9 5L4 10l5 5" />
    </svg>
  );
}

function CheckIcon({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 10l4 4 8-8" />
    </svg>
  );
}

function formatRange(startISO: string, endISO: string): string {
  const start = new Date(`${startISO}T12:00:00Z`);
  const end = new Date(`${endISO}T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString(
    "en-US",
    opts,
  )}`;
}

const WEEKDAY_LABEL: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export function RetroForm({
  weekStart,
  weekEnd,
  weekNumber,
  isRetroDay,
  retroDay,
  existingWins,
  existingStruggles,
  existingLessons,
  existingSynthesis,
  existingFocus,
  weekCheckins,
}: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState({
    wins: existingWins,
    struggles: existingStruggles,
    lessons: existingLessons,
  });
  const [synthesis, setSynthesis] = useState(existingSynthesis);
  const [focus, setFocus] = useState(existingFocus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(id: (typeof STEPS)[number]["id"], v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  const stepDone = (i: number) =>
    values[STEPS[i].id].trim().length >= 10;

  async function submit() {
    setError(null);
    const total =
      values.wins.trim().length +
      values.struggles.trim().length +
      values.lessons.trim().length;
    if (total < 20) {
      setError("Write at least a sentence or two across the three fields.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/retro/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            week_start: weekStart,
            wins: values.wins.trim(),
            struggles: values.struggles.trim(),
            lessons: values.lessons.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Something broke on our end.");
          return;
        }
        setSynthesis(json.synthesis);
        setFocus(json.framework_focus);
        router.refresh();
      } catch {
        setError("Network problem. Your fields are still here — try again.");
      }
    });
  }

  if (synthesis) {
    return (
      <SiteReport
        weekNumber={weekNumber}
        weekStart={weekStart}
        weekEnd={weekEnd}
        wins={values.wins}
        struggles={values.struggles}
        lessons={values.lessons}
        synthesis={synthesis}
        focus={focus}
        weekCheckins={weekCheckins}
      />
    );
  }

  const step = STEPS[activeStep];
  const isLast = activeStep === STEPS.length - 1;
  const canAdvance = stepDone(activeStep);

  return (
    <div className="space-y-5">
      <div className="px-1">
        <p className="type-cap text-oak-dim">
          WEEK {String(weekNumber).padStart(2, "0")} RETRO ·{" "}
          {activeStep + 1} OF {STEPS.length}
        </p>
        <h1 className="type-h1 mt-2 text-ink">{step.title}</h1>
        <p className="type-body mt-2 text-graphite">
          {isRetroDay
            ? step.sub
            : `${step.sub} Your retro day is ${WEEKDAY_LABEL[retroDay] ?? retroDay}, but you can write any time this week.`}
        </p>
      </div>

      {/* Progress strip */}
      <div className="space-y-1">
        {STEPS.map((s, i) => {
          const isActive = i === activeStep;
          const isDone = stepDone(i);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStep(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                isActive
                  ? "border-ink bg-ink text-chalk"
                  : "border-rule bg-transparent text-ink2 hover:bg-paper2/50",
              )}
            >
              <span
                className={cn(
                  "type-spec",
                  isActive ? "text-oak" : "text-graphite",
                )}
              >
                {s.n}
              </span>
              <span
                className={cn(
                  "type-label flex-1",
                  isActive ? "text-chalk" : "text-ink2",
                )}
              >
                {s.id === "wins"
                  ? "Wins · what landed"
                  : s.id === "struggles"
                    ? "Struggles · what hurt"
                    : "Lessons · what changed"}
              </span>
              {isDone ? (
                <CheckIcon
                  className={isActive ? "text-oak" : "text-moss"}
                  size={14}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor={`field-${step.id}`}
          className="type-label mb-2 block text-ink2"
        >
          {step.id === "lessons"
            ? "One real lesson — five words or fifty"
            : step.id === "wins"
              ? "Wins from this week"
              : "Struggles from this week"}
        </label>
        <Textarea
          id={`field-${step.id}`}
          value={values[step.id]}
          onChange={(e) => update(step.id, e.target.value)}
          rows={6}
          placeholder={step.placeholder}
          autoFocus
        />
      </div>

      {weekCheckins.length > 0 ? (
        <div>
          <p className="type-cap mb-2 text-graphite">
            THIS WEEK · {weekCheckins.length} CHECK-IN
            {weekCheckins.length === 1 ? "" : "S"}
          </p>
          <div className="space-y-1.5">
            {weekCheckins.map((c) => (
              <div
                key={c.checkin_date}
                className="flex items-center gap-3 rounded-sm border border-rule bg-chalk px-3 py-2"
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] bg-paper2 type-spec text-[10px] text-graphite">
                  {new Date(
                    `${c.checkin_date}T12:00:00Z`,
                  )
                    .toLocaleDateString("en-US", {
                      weekday: "short",
                      timeZone: "UTC",
                    })
                    .charAt(0)}
                </span>
                <span className="type-body-sm flex-1 truncate text-ink2">
                  {c.prompt_text}
                </span>
                <PhaseTag phase={c.framework_phase as never} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="type-caption text-rust">{error}</p> : null}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0}
        >
          <BackIcon /> Back
        </Button>
        <div className="flex-1" />
        {isLast ? (
          <Button onClick={submit} disabled={pending || !canAdvance} size="lg">
            {pending ? (
              <>
                <Spinner /> Building report…
              </>
            ) : (
              <>
                Build the report <ArrowIcon />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canAdvance}
            size="lg"
          >
            Continue <ArrowIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

interface SiteReportProps {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  wins: string;
  struggles: string;
  lessons: string;
  synthesis: string;
  focus: string | null;
  weekCheckins: WeekCheckin[];
}

function SiteReport({
  weekNumber,
  weekStart,
  weekEnd,
  wins,
  struggles,
  lessons,
  synthesis,
  focus,
  weekCheckins,
}: SiteReportProps) {
  const winsCount = wins.trim() ? wins.trim().split(/[.\n]+/).filter((s) => s.trim().length > 4).length : 0;
  const strugglesCount = struggles.trim()
    ? struggles.trim().split(/[.\n]+/).filter((s) => s.trim().length > 4).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <span className="type-cap text-graphite">
          WEEK {String(weekNumber).padStart(2, "0")} · SITE REPORT
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-rule bg-chalk">
        <div className="border-b border-rule p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="type-cap text-graphite">FOREMAN · SITE REPORT</span>
            <span className="type-cap text-graphite">
              WK {String(weekNumber).padStart(2, "0")} ·{" "}
              {new Date(`${weekStart}T00:00:00Z`).getUTCFullYear()}
            </span>
          </div>
          <div className="mb-3 h-[2px] w-7 bg-oak" />
          <h2 className="type-h1 text-ink">The week, synthesized.</h2>
          <p className="type-caption mt-2 text-graphite">
            {formatRangeFull(weekStart, weekEnd)} · {weekCheckins.length}{" "}
            check-in{weekCheckins.length === 1 ? "" : "s"}
            {focus ? (
              <span>
                {" "}
                · focus:{" "}
                <span className="font-medium text-ink2">{focus}</span>
              </span>
            ) : null}
          </p>
        </div>

        <div className="border-b border-rule p-5">
          <p className="type-cap mb-2 text-graphite">THE THROUGH-LINE</p>
          <div className="space-y-3">
            {synthesis.split(/\n\s*\n/).map((p, i) => (
              <p
                key={i}
                className="type-body-lg leading-[1.6] text-ink"
              >
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-rule">
          <div className="border-r border-rule p-5">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="type-h2 text-[20px] text-moss">{winsCount}</span>
              <span className="type-cap text-graphite">WINS</span>
            </div>
            <p className="type-body-sm text-ink2">
              {firstClause(wins, 100) || "—"}
            </p>
          </div>
          <div className="p-5">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="type-h2 text-[20px] text-rust">
                {strugglesCount}
              </span>
              <span className="type-cap text-graphite">STRUGGLES</span>
            </div>
            <p className="type-body-sm text-ink2">
              {firstClause(struggles, 100) || "—"}
            </p>
          </div>
        </div>

        {lessons.trim() ? (
          <div className="p-5">
            <p className="type-cap mb-2 text-graphite">WHAT YOU SAID</p>
            <p className="type-prompt text-[17px] leading-[1.45] text-ink">
              &ldquo;{firstClause(lessons, 180)}&rdquo;
            </p>
          </div>
        ) : null}
      </div>

      <p className="type-caption text-center text-graphite">
        Saved. See you next week.
      </p>
    </div>
  );
}

function formatRangeFull(startISO: string, endISO: string): string {
  const start = new Date(`${startISO}T12:00:00Z`);
  const end = new Date(`${endISO}T12:00:00Z`);
  const sm = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const em = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${sm} – ${em}`;
}

function firstClause(s: string, max: number): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.{20,}?[.!?])(\s|$)/);
  const candidate = (match ? match[1] : trimmed).slice(0, max);
  return candidate + (candidate.length < trimmed.length ? "…" : "");
}
