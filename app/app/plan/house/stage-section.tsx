"use client";

// One construction stage in the house journey. Renders the stage's owned goal
// levels (Vision owns two) as "level blocks" with inline add / complete /
// delete, all driven through the EXISTING server actions — no data-layer
// changes. Completing a goal flows back through router.refresh(), the build
// recomputes, and the house rises.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { settle, boardUp } from "@/lib/motion";
import type { GoalLevel, GrowthGoal } from "@/lib/database.types";
import { addGoal, deleteGoal, setGoalStatus } from "../actions";
import type { StageDef, StageProgress } from "./progress";

type ActionResult = { ok: true } | { ok: false; error?: string };

// The three mutations a stage performs. Defaults to the real server actions;
// the dev-only preview injects local-state versions so the journey is fully
// interactive without Supabase. Production behavior is unchanged.
export interface StageActions {
  addGoal: (input: unknown) => Promise<ActionResult>;
  setGoalStatus: (input: unknown) => Promise<ActionResult>;
  deleteGoal: (input: unknown) => Promise<ActionResult>;
}

const DEFAULT_ACTIONS: StageActions = { addGoal, setGoalStatus, deleteGoal };

const LEVEL_META: Record<
  GoalLevel,
  { label: string; hint: string; addNoun: string }
> = {
  ten_year: {
    label: "Ten-year directions",
    hint: "Who you are becoming.",
    addNoun: "direction",
  },
  five_year: {
    label: "Five-year milestones",
    hint: "The major markers on the way.",
    addNoun: "milestone",
  },
  six_month: {
    label: "Six-month milestone",
    hint: "What the next inspection measures.",
    addNoun: "milestone",
  },
  monthly: {
    label: "Monthly focus",
    hint: "The rooms you're building this season.",
    addNoun: "focus area",
  },
  weekly: {
    label: "Weekly work orders",
    hint: "This week's precise cuts.",
    addNoun: "work order",
  },
  daily: {
    label: "Daily tasks",
    hint: "Today's materials and labor.",
    addNoun: "task",
  },
};

const PARENT_LEVEL: Record<GoalLevel, GoalLevel | null> = {
  ten_year: null,
  five_year: "ten_year",
  six_month: "five_year",
  monthly: "six_month",
  weekly: "monthly",
  daily: "weekly",
};

const PARENT_NOUN: Record<GoalLevel, string> = {
  ten_year: "ten-year direction",
  five_year: "five-year milestone",
  six_month: "six-month milestone",
  monthly: "monthly focus",
  weekly: "weekly work order",
  daily: "daily task",
};

export function StageSection({
  def,
  goals,
  stageProgress,
  northStar,
  actions = DEFAULT_ACTIONS,
  skipRefresh = false,
  collapsed = false,
  onHeaderClick,
  spotlight = false,
}: {
  def: StageDef;
  goals: GrowthGoal[];
  stageProgress: StageProgress;
  northStar?: string | null;
  actions?: StageActions;
  skipRefresh?: boolean;
  /** Accordion: render only the header row. */
  collapsed?: boolean;
  /** When set, the header becomes a toggle button. */
  onHeaderClick?: () => void;
  /**
   * The user just traveled here (via "your next move"): highlight the card and
   * open the primary level's add form so the landing needs zero hunting.
   */
  spotlight?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something broke.");
      else if (!skipRefresh) router.refresh();
    });
  }

  const { done, total, ratio } = stageProgress;

  const HeaderInner = (
    <>
      <div className="flex items-center gap-2">
        {onHeaderClick ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "shrink-0 text-graphite transition-transform",
              collapsed ? "" : "rotate-90",
            )}
          >
            <path d="M7 5l6 5-6 5" />
          </svg>
        ) : null}
        <div className="text-left">
          <p className="type-cap text-blueprint">{def.cap}</p>
          <h3 className="type-h2 mt-1.5 text-ink">{def.title}</h3>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {collapsed && total > 0 ? (
          <span className="type-cap text-graphite">
            {done}/{total}
          </span>
        ) : null}
        <StageDial ratio={total > 0 ? ratio : 0} index={def.index} />
      </div>
    </>
  );

  return (
    <section
      data-stage-card
      id={`stage-${def.key}`}
      className={cn(
        "relative scroll-mt-20 rounded-xl border bg-chalk p-5 shadow-lift transition-all duration-500",
        stageProgress.hasGoals ? "border-rule" : "border-dashed border-ruleStrong",
        spotlight && "border-blueprint ring-2 ring-blueprint/40 ring-offset-2 ring-offset-paper",
      )}
    >
      {/* Stage header (toggles the accordion when onHeaderClick is set) */}
      {onHeaderClick ? (
        <button
          type="button"
          onClick={onHeaderClick}
          className="flex w-full items-start justify-between gap-3"
        >
          {HeaderInner}
        </button>
      ) : (
        <div className="flex items-start justify-between gap-3">{HeaderInner}</div>
      )}

      {collapsed ? null : (
        <>
          <p className="type-prompt mt-3 text-ink2">{def.question}</p>
          <p className="type-body-sm mt-1.5 text-graphite">{def.blurb}</p>

          {total > 0 ? (
            <p className="type-cap mt-3 text-graphite">
              {done} / {total} COMPLETE
            </p>
          ) : null}

      {/* Vision north star */}
      {northStar ? (
        <div className="mt-4 rounded-lg border border-blueprint/15 surface-blueprint p-4">
          <p className="type-cap text-blueprint">NORTH STAR · 10-YEAR</p>
          <p className="type-body mt-1.5 whitespace-pre-wrap text-ink2">
            {northStar}
          </p>
        </div>
      ) : null}

      {error ? <p className="type-caption mt-3 text-rust">{error}</p> : null}

          {/* Level blocks */}
          <div className="mt-4 space-y-5">
            {def.levels.map((level) => (
              <LevelBlock
                key={level}
                level={level}
                goals={goals}
                pending={pending}
                onToggle={(id, status) =>
                  run(() => actions.setGoalStatus({ id, status }))
                }
                onDelete={(id) => run(() => actions.deleteGoal({ id }))}
                onAdd={(body, parentId) =>
                  run(() =>
                    actions.addGoal({ level, body, parent_goal_id: parentId }),
                  )
                }
                showLabel={def.levels.length > 1}
                autoOpenAdd={spotlight && level === def.primaryLevel}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// A small architectural "completion dial" — a ring that fills with the ratio.
function StageDial({ ratio, index }: { ratio: number; index: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(26,24,22,0.10)" strokeWidth="3" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="#5f7d69"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={settle}
        />
      </svg>
      <span className="type-cap absolute inset-0 flex items-center justify-center text-graphite">
        {index + 1}
      </span>
    </div>
  );
}

function LevelBlock({
  level,
  goals,
  pending,
  onToggle,
  onDelete,
  onAdd,
  showLabel,
  autoOpenAdd = false,
}: {
  level: GoalLevel;
  goals: GrowthGoal[];
  pending: boolean;
  onToggle: (id: string, status: "open" | "done") => void;
  onDelete: (id: string) => void;
  onAdd: (body: string, parentId: string | null) => void;
  showLabel: boolean;
  autoOpenAdd?: boolean;
}) {
  const meta = LEVEL_META[level];
  const items = goals.filter((g) => g.level === level && g.status !== "dropped");
  const parentLevel = PARENT_LEVEL[level];
  const parents = parentLevel
    ? goals.filter((g) => g.level === parentLevel && g.status !== "dropped")
    : [];
  const labelFor = (id: string | null) =>
    id ? goals.find((g) => g.id === id)?.body ?? null : null;

  return (
    <div>
      {showLabel ? (
        <div className="mb-2 flex items-baseline justify-between">
          <p className="type-label text-ink">{meta.label}</p>
          <span className="type-cap text-graphite">{items.length}</span>
        </div>
      ) : null}

      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((g) => (
            <motion.li
              key={g.id}
              layout
              variants={boardUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -8, transition: { duration: 0.18 } }}
              className="rounded-md border border-rule bg-paper2/30 px-3 py-2"
            >
              <div className="flex items-start gap-2.5">
                <CompleteBox
                  done={g.status === "done"}
                  disabled={pending}
                  onClick={() =>
                    onToggle(g.id, g.status === "done" ? "open" : "done")
                  }
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      "type-body-sm text-ink",
                      g.status === "done" && "text-graphite line-through",
                    )}
                  >
                    {g.body}
                  </p>
                  {parentLevel && !g.ladders_up ? (
                    <p className="type-caption mt-1 text-oak-dim">
                      Doesn&apos;t connect to a {PARENT_NOUN[parentLevel]} yet.
                    </p>
                  ) : parentLevel && g.parent_goal_id ? (
                    <p className="type-caption mt-1 text-graphite">
                      ↳ {labelFor(g.parent_goal_id)}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(g.id)}
                  disabled={pending}
                  aria-label="Delete"
                  className="type-cap mt-0.5 text-graphite transition-colors hover:text-rust"
                >
                  ✕
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 ? (
          <li className="type-caption text-graphite">Nothing here yet.</li>
        ) : null}
      </ul>

      <AddGoal
        addNoun={meta.addNoun}
        parents={parents}
        parentNoun={parentLevel ? PARENT_NOUN[parentLevel] : null}
        pending={pending}
        onAdd={onAdd}
        forceOpen={autoOpenAdd}
      />
    </div>
  );
}

function CompleteBox({
  done,
  disabled,
  onClick,
}: {
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={done ? "Reopen" : "Mark complete"}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border",
        done ? "border-moss bg-moss text-chalk" : "border-ruleStrong bg-transparent",
      )}
    >
      <AnimatePresence>
        {done ? (
          <motion.svg
            key="check"
            width="11"
            height="11"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.path d="M4 10l4 4 8-8" />
          </motion.svg>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}

function AddGoal({
  addNoun,
  parents,
  parentNoun,
  pending,
  onAdd,
  forceOpen = false,
}: {
  addNoun: string;
  parents: GrowthGoal[];
  parentNoun: string | null;
  pending: boolean;
  onAdd: (body: string, parentId: string | null) => void;
  /** Landing via "your next move" opens the form so nobody hunts for "+ Add". */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="type-label mt-3 inline-flex items-center gap-1 text-graphite transition-colors hover:text-ink"
      >
        <span className="text-base leading-none">+</span> Add a {addNoun}
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 space-y-2 overflow-hidden border-t border-rule pt-3"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={`Write the ${addNoun}…`}
        autoFocus
      />
      {parentNoun && parents.length ? (
        <div>
          <label className="type-cap text-graphite">
            LADDERS UP TO ({parentNoun})
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
    </motion.div>
  );
}
