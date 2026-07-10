"use client";

// Today's boards on the Home check-in — the bridge between the Plan's
// "Materials & Build" stage and the daily reflection. Checking a board here
// completes the goal AND records it in the cascade history the inspection
// reads (see toggleDailyBoard). Same data as the Plan page; one daily ritual.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GrowthGoal } from "@/lib/database.types";
import { addGoal, toggleDailyBoard } from "./plan/actions";

export function TodayBoards({
  boards,
  autoParentId,
}: {
  boards: Pick<GrowthGoal, "id" | "body" | "status">[];
  /** Freshest open weekly goal — quick-adds ladder up to it. */
  autoParentId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");

  const open = boards.filter((b) => b.status === "open");
  const done = boards.filter((b) => b.status === "done");

  function toggle(id: string, completed: boolean) {
    setError(null);
    start(async () => {
      const res = await toggleDailyBoard({ goal_id: id, completed });
      if (!res.ok) setError(res.error ?? "Something broke.");
      router.refresh();
    });
  }

  function add() {
    const text = body.trim();
    if (text.length < 3) return;
    setBody("");
    setAdding(false);
    start(async () => {
      const res = await addGoal({
        level: "daily",
        body: text,
        parent_goal_id: autoParentId,
      });
      if (!res.ok) setError(res.error ?? "Something broke.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-rule bg-chalk p-4">
      <div className="flex items-baseline justify-between">
        <p className="type-cap text-graphite">TODAY&apos;S BOARDS · FROM YOUR PLAN</p>
        <Link href="/app/plan" className="type-caption text-graphite hover:text-ink">
          Manage →
        </Link>
      </div>

      {boards.length === 0 ? (
        <p className="type-body-sm mt-2 text-graphite">
          No boards cut for today yet — add one below, or lay out the week on
          your <Link href="/app/plan" className="text-blueprint underline-offset-2 hover:underline">plan</Link>.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          <AnimatePresence initial={false}>
            {[...open, ...done].map((b) => {
              const isDone = b.status === "done";
              return (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8, transition: { duration: 0.16 } }}
                  className="flex items-start gap-2.5 rounded-lg px-1 py-1.5"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={b.body}
                    disabled={pending}
                    onClick={() => toggle(b.id, !isDone)}
                    className={cn(
                      "mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
                      isDone
                        ? "border-moss bg-moss text-[oklch(0.98_0.01_150)]"
                        : "border-ruleStrong bg-transparent",
                    )}
                  >
                    {isDone ? (
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
                    disabled={pending}
                    onClick={() => toggle(b.id, !isDone)}
                    className={cn(
                      "type-body flex-1 text-left transition-colors",
                      isDone ? "text-graphite line-through" : "text-ink",
                    )}
                  >
                    {b.body}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {error ? <p className="type-caption mt-2 text-rust">{error}</p> : null}

      {adding ? (
        <div className="mt-3 flex items-center gap-2 border-t border-ruleSoft pt-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
            maxLength={500}
            placeholder="One small thing you can finish today…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setBody("");
              }
            }}
            className="type-body flex-1 rounded-lg border border-rule bg-paper px-3 py-2 text-ink outline-none focus:border-blueprint"
          />
          <button
            type="button"
            disabled={pending || body.trim().length < 3}
            onClick={add}
            className="type-label rounded-lg bg-ink px-3.5 py-2 text-[oklch(0.97_0.01_80)] disabled:bg-shell disabled:text-haze"
          >
            {pending ? <Spinner /> : "Add"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="type-label mt-3 inline-flex items-center gap-1 text-graphite transition-colors hover:text-ink"
        >
          <span className="text-base leading-none">+</span> Add a board
        </button>
      )}
    </div>
  );
}
