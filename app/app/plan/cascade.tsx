"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GoalLevel, GrowthGoal } from "@/lib/database.types";
import { addGoal, deleteGoal, setGoalStatus } from "./actions";

const LEVELS: {
  key: GoalLevel;
  label: string;
  parent: GoalLevel | null;
  hint: string;
}[] = [
  { key: "ten_year", label: "Ten-year direction", parent: null, hint: "Who you are becoming." },
  { key: "five_year", label: "Five-year milestones", parent: "ten_year", hint: "Major markers." },
  { key: "six_month", label: "Six-month milestone", parent: "five_year", hint: "What the next inspection measures." },
  { key: "monthly", label: "Monthly goals", parent: "six_month", hint: "The building phases." },
  { key: "weekly", label: "Weekly goals", parent: "monthly", hint: "The work orders." },
  { key: "daily", label: "Daily goals", parent: "weekly", hint: "Tasks on the site." },
];

const PARENT_LABEL: Record<GoalLevel, string> = {
  ten_year: "ten-year direction",
  five_year: "five-year milestone",
  six_month: "six-month milestone",
  monthly: "monthly goal",
  weekly: "weekly goal",
  daily: "daily goal",
};

export function Cascade({ goals }: { goals: GrowthGoal[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byLevel = (lvl: GoalLevel) => goals.filter((g) => g.level === lvl);
  const labelFor = (id: string | null) =>
    id ? goals.find((g) => g.id === id)?.body ?? null : null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something broke.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="px-1">
        <p className="type-cap text-oak-dim">THE CASCADE</p>
        <h2 className="type-h2 mt-1 text-ink">From ten years down to today</h2>
        <p className="type-body-sm mt-1 text-graphite">
          Each level ladders up to the one above it. A goal that doesn&apos;t
          connect yet gets a gentle flag, never a block.
        </p>
      </div>

      {error ? <p className="type-caption px-1 text-rust">{error}</p> : null}

      {LEVELS.map((lvl) => {
        const items = byLevel(lvl.key);
        const parents = lvl.parent ? byLevel(lvl.parent) : [];
        return (
          <section key={lvl.key} className="rounded-lg border border-rule bg-chalk p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="type-label text-ink">{lvl.label}</h3>
              <span className="type-cap text-graphite">{items.length}</span>
            </div>
            <p className="type-caption text-graphite">{lvl.hint}</p>

            <ul className="mt-3 space-y-1.5">
              {items.map((g) => (
                <li
                  key={g.id}
                  className="rounded-md border border-rule bg-paper2/30 px-3 py-2"
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      aria-label={g.status === "done" ? "Reopen" : "Mark done"}
                      onClick={() =>
                        run(() =>
                          setGoalStatus({
                            id: g.id,
                            status: g.status === "done" ? "open" : "done",
                          }),
                        )
                      }
                      disabled={pending}
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border",
                        g.status === "done"
                          ? "border-moss bg-moss text-chalk"
                          : "border-ruleStrong bg-transparent",
                      )}
                    >
                      {g.status === "done" ? (
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 10l4 4 8-8" />
                        </svg>
                      ) : null}
                    </button>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "type-body-sm text-ink",
                          g.status === "done" && "text-graphite line-through",
                        )}
                      >
                        {g.body}
                      </p>
                      {lvl.parent && !g.ladders_up ? (
                        <p className="type-caption mt-1 text-oak-dim">
                          Doesn&apos;t connect to a {PARENT_LABEL[lvl.parent]} yet.
                          Want to link it?
                        </p>
                      ) : lvl.parent && g.parent_goal_id ? (
                        <p className="type-caption mt-1 text-graphite">
                          ↳ {labelFor(g.parent_goal_id)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => run(() => deleteGoal({ id: g.id }))}
                      disabled={pending}
                      aria-label="Delete goal"
                      className="type-cap mt-0.5 text-graphite hover:text-rust"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {items.length === 0 ? (
                <li className="type-caption text-graphite">Nothing here yet.</li>
              ) : null}
            </ul>

            <AddGoal
              level={lvl.key}
              parents={parents}
              parentLevelLabel={lvl.parent ? PARENT_LABEL[lvl.parent] : null}
              pending={pending}
              onAdd={(body, parentId) =>
                run(() =>
                  addGoal({
                    level: lvl.key,
                    body,
                    parent_goal_id: parentId,
                  }),
                )
              }
            />
          </section>
        );
      })}
    </div>
  );
}

function AddGoal({
  level,
  parents,
  parentLevelLabel,
  pending,
  onAdd,
}: {
  level: GoalLevel;
  parents: GrowthGoal[];
  parentLevelLabel: string | null;
  pending: boolean;
  onAdd: (body: string, parentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState<string>("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="type-label mt-3 text-graphite hover:text-ink"
      >
        + Add a {level === "ten_year" ? "direction" : "goal"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-rule pt-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Write the goal…"
        autoFocus
      />
      {parentLevelLabel && parents.length ? (
        <div>
          <label className="type-cap text-graphite">
            LADDERS UP TO ({parentLevelLabel})
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-rule bg-paper px-3 py-2 text-[14px] text-ink"
          >
            <option value="">Not linked yet</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.body.length > 60 ? `${p.body.slice(0, 60)}…` : p.body}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending || body.trim().length < 3}
          onClick={() => {
            onAdd(body.trim(), parentId || null);
            setBody("");
            setParentId("");
            setOpen(false);
          }}
        >
          {pending ? <Spinner /> : "Add"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setBody("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
