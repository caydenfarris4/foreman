"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CascadeCheckinType } from "@/lib/database.types";
import { saveCascadeCheckin } from "../actions";

interface Goal {
  id: string;
  body: string;
  parent_goal_id?: string | null;
  status?: string;
}

const TABS: { type: CascadeCheckinType; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "weekly", label: "Weekly" },
  { type: "monthly", label: "Monthly" },
];

const COPY: Record<
  CascadeCheckinType,
  { title: string; sub: string; anchorLabel: string; emptyLevel: string }
> = {
  daily: {
    title: "Today on the site",
    sub: "Mark what you finished. One line of reflection if you want it.",
    anchorLabel: "This week's work orders",
    emptyLevel: "daily goal",
  },
  weekly: {
    title: "This week's work orders",
    sub: "Review the week against your monthly goal.",
    anchorLabel: "This month's goals",
    emptyLevel: "weekly goal",
  },
  monthly: {
    title: "This month's build",
    sub: "Review the month against your six-month milestone.",
    anchorLabel: "Your six-month milestone",
    emptyLevel: "monthly goal",
  },
};

export function CascadeCheckinForm({
  type,
  periodDate,
  periodLabel,
  goals,
  anchorGoals,
  initialCompletions,
  initialReflection,
}: {
  type: CascadeCheckinType;
  periodDate: string;
  periodLabel: string;
  goals: Goal[];
  anchorGoals: { id: string; body: string }[];
  initialCompletions: Record<string, boolean>;
  initialReflection: string;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    initialCompletions,
  );
  const [reflection, setReflection] = useState(initialReflection);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const copy = COPY[type];

  function toggle(id: string) {
    setCompleted((c) => ({ ...c, [id]: !c[id] }));
    setSaved(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveCascadeCheckin({
        checkin_type: type,
        period_date: periodDate,
        reflection: reflection.trim(),
        completions: goals.map((g) => ({
          goal_id: g.id,
          completed: !!completed[g.id],
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const doneCount = goals.filter((g) => completed[g.id]).length;

  return (
    <div className="space-y-5 px-3 pb-8 pt-6">
      <div className="px-1">
        <p className="type-cap text-oak-dim">CASCADE CHECK-IN · {periodLabel}</p>
        <h1 className="type-h1 mt-2 text-ink">{copy.title}</h1>
        <p className="type-body mt-2 text-graphite">{copy.sub}</p>
      </div>

      {/* Type tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-md border border-rule bg-chalk p-1">
        {TABS.map((t) => (
          <Link
            key={t.type}
            href={`/app/plan/checkin?type=${t.type}`}
            className={cn(
              "rounded-[6px] py-2 text-center transition-colors",
              t.type === type
                ? "bg-ink text-chalk"
                : "text-graphite hover:bg-paper2/60",
            )}
          >
            <span className="type-label">{t.label}</span>
          </Link>
        ))}
      </div>

      {/* Anchor context */}
      {anchorGoals.length ? (
        <div className="rounded-md border border-rule bg-paper2/40 px-4 py-3">
          <p className="type-cap text-graphite">
            REVIEWING AGAINST · {copy.anchorLabel.toUpperCase()}
          </p>
          <ul className="mt-2 space-y-1">
            {anchorGoals.map((g) => (
              <li key={g.id} className="type-body-sm text-ink2">
                {g.body}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Goals to mark complete */}
      <div>
        <div className="flex items-baseline justify-between px-1">
          <p className="type-cap text-graphite">
            {copy.emptyLevel.toUpperCase()}S
          </p>
          {goals.length ? (
            <span className="type-cap text-graphite">
              {doneCount}/{goals.length} done
            </span>
          ) : null}
        </div>
        {goals.length === 0 ? (
          <div className="mt-2 rounded-md border border-rule bg-chalk px-4 py-5 text-center">
            <p className="type-body-sm text-graphite">
              No {copy.emptyLevel}s yet.
            </p>
            <Link
              href="/app/plan"
              className="type-label mt-2 inline-block text-oak-dim hover:text-ink"
            >
              Add some in your plan →
            </Link>
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {goals.map((g) => {
              const on = !!completed[g.id];
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                      on
                        ? "border-moss/40 bg-moss-wash"
                        : "border-rule bg-chalk hover:bg-paper2/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border",
                        on
                          ? "border-moss bg-moss text-chalk"
                          : "border-ruleStrong bg-transparent",
                      )}
                    >
                      {on ? (
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 10l4 4 8-8" />
                        </svg>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "type-body-sm",
                        on ? "text-ink" : "text-ink2",
                      )}
                    >
                      {g.body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reflection */}
      <div>
        <label htmlFor="reflection" className="type-label text-ink2">
          Reflection <span className="type-caption text-graphite">(optional)</span>
        </label>
        <Textarea
          id="reflection"
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value);
            setSaved(false);
          }}
          rows={3}
          className="mt-2"
          placeholder={
            type === "daily"
              ? "One line. What held, what slipped."
              : "What moved the build forward, what stalled."
          }
        />
      </div>

      {error ? <p className="type-caption text-rust">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save check-in"
          )}
        </Button>
        {saved ? <span className="type-caption text-moss">Saved.</span> : null}
        <div className="flex-1" />
        <Link
          href="/app/plan"
          className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
        >
          Back to plan
        </Link>
      </div>
    </div>
  );
}
