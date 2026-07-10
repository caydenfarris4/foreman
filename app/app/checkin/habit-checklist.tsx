"use client";

// The no-writing daily checklist ("made my bed"). Optimistic checkboxes —
// a tap flips instantly, the amber "lit" glow lands when everything's done.
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button, Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DailyHabit } from "@/lib/database.types";
import { addHabit, archiveHabit, setHabitChecked } from "./habit-actions";

export function HabitChecklist({
  habits,
  checkedIds,
  today,
}: {
  habits: DailyHabit[];
  checkedIds: string[];
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [optimisticChecked, toggleOptimistic] = useOptimistic(
    new Set(checkedIds),
    (set: Set<string>, id: string) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    },
  );

  if (habits.length === 0 && !adding) {
    return (
      <div className="rounded-xl border border-dashed border-ruleStrong bg-chalk/60 p-4">
        <p className="type-cap text-graphite">DAILY HABITS</p>
        <p className="type-body-sm mt-1.5 text-graphite">
          Small daily goals that don&apos;t need writing — made the bed, drank
          water, read a page. Check them off as you go.
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="type-label mt-3 inline-flex items-center gap-1 text-blueprint transition-colors hover:text-blueprint-dim"
        >
          <span className="text-base leading-none">+</span> Add your first habit
        </button>
      </div>
    );
  }

  const doneCount = habits.filter((h) => optimisticChecked.has(h.id)).length;
  const allDone = habits.length > 0 && doneCount === habits.length;

  function toggle(id: string, isChecked: boolean) {
    setError(null);
    start(async () => {
      toggleOptimistic(id);
      const res = await setHabitChecked({
        habit_id: id,
        check_date: today,
        checked: !isChecked,
      });
      if (!res.ok) setError(res.error ?? "Something broke.");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-rule bg-chalk p-4 transition-shadow duration-500",
        allDone && "glow-lit",
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="type-cap text-graphite">DAILY HABITS</p>
        <span className={cn("type-cap", allDone ? "text-amber" : "text-graphite")}>
          {doneCount}/{habits.length}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const isChecked = optimisticChecked.has(h.id);
            return (
              <motion.li
                key={h.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8, transition: { duration: 0.16 } }}
                className="group flex items-center gap-3 rounded-lg px-1 py-1.5"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={h.label}
                  onClick={() => toggle(h.id, isChecked)}
                  className={cn(
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                    isChecked
                      ? "border-moss bg-moss text-[oklch(0.98_0.01_150)]"
                      : "border-ruleStrong bg-transparent",
                  )}
                >
                  {isChecked ? (
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      <motion.path d="M4 10l4 4 8-8" />
                    </motion.svg>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(h.id, isChecked)}
                  className={cn(
                    "type-body flex-1 text-left transition-colors",
                    isChecked ? "text-graphite line-through" : "text-ink",
                  )}
                >
                  {h.label}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${h.label}`}
                  onClick={() =>
                    start(async () => {
                      const res = await archiveHabit({ id: h.id });
                      if (!res.ok) setError(res.error ?? "Something broke.");
                      router.refresh();
                    })
                  }
                  className="type-cap text-transparent transition-colors group-hover:text-graphite hover:!text-rust"
                >
                  ✕
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {error ? <p className="type-caption mt-2 text-rust">{error}</p> : null}

      {adding ? (
        <div className="mt-3 flex items-center gap-2 border-t border-ruleSoft pt-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            placeholder="e.g. Made my bed"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (label.trim().length >= 2) {
                  const value = label.trim();
                  setLabel("");
                  setAdding(false);
                  start(async () => {
                    const res = await addHabit({ label: value });
                    if (!res.ok) setError(res.error ?? "Something broke.");
                    router.refresh();
                  });
                }
              }
              if (e.key === "Escape") {
                setAdding(false);
                setLabel("");
              }
            }}
            className="type-body flex-1 rounded-lg border border-rule bg-paper px-3 py-2 text-ink outline-none focus:border-blueprint"
          />
          <Button
            size="sm"
            disabled={pending || label.trim().length < 2}
            onClick={() => {
              const value = label.trim();
              setLabel("");
              setAdding(false);
              start(async () => {
                const res = await addHabit({ label: value });
                if (!res.ok) setError(res.error ?? "Something broke.");
                router.refresh();
              });
            }}
          >
            {pending ? <Spinner /> : "Add"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="type-label mt-3 inline-flex items-center gap-1 text-graphite transition-colors hover:text-ink"
        >
          <span className="text-base leading-none">+</span> Add a habit
        </button>
      )}
    </div>
  );
}
