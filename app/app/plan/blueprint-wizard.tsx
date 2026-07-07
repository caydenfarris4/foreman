"use client";

// The guided "lay the foundation" flow — the empty-state of the Plan tab.
//
// Replaces the old cold, three-field blueprint form. Built on the funnel
// research (docs/PLAN_HOUSE_UX_FLOW.md):
//   - One question per screen (progressive disclosure) instead of a wall.
//   - A live house that rises as each step is committed (endowed progress +
//     goal-gradient) — you watch the foundation pour while you plan.
//   - Foot-in-the-door: a small first "yes" (one line of vision) before the
//     larger commitments.
// Still writes through the existing savePlan action (no backend change).
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MAX_WEIGHTED_PRINCIPLES,
  MIN_WEIGHTED_PRINCIPLES,
  PRINCIPLES,
} from "@/lib/inspection/principles";
import { HouseScene } from "./house/house-scene";
import { FOUNDATION_FLOOR, STAGES } from "./house/progress";
import { savePlan } from "./actions";

const MIN_TEN = 200;

// How "built" the house looks after each committed step — the foundation pours
// as the plan comes together. The final step lands EXACTLY on the endowed
// FOUNDATION_FLOOR the journey opens with, so progress never moves backwards
// after saving (a house that shrinks right after your biggest commitment is
// loss-aversion poison).
const STEP_BUILD = [0.02, 0.08, 0.12, 0.16, FOUNDATION_FLOOR];

const STEP_CAPTION = [
  "An empty lot — and a blueprint waiting to be drawn.",
  "Foundation pouring as you name where you're headed…",
  "The frame takes shape around your milestones…",
  "The first room is measured out…",
  "Choose what to master, then pour the foundation.",
];

export function BlueprintWizard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const build = useMotionValue(STEP_BUILD[0]);

  const [step, setStep] = useState(0);
  const [ten, setTen] = useState("");
  const [five, setFive] = useState("");
  const [six, setSix] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Raise the house each time the user advances a step (or snap, if reduced).
  useEffect(() => {
    const target = STEP_BUILD[step];
    if (reduce) {
      build.set(target);
      return;
    }
    const controls = animate(build, target, {
      duration: 1,
      ease: [0.22, 0.61, 0.36, 1],
    });
    return () => controls.stop();
  }, [step, reduce, build]);

  function toggle(key: string) {
    setSelected((s) =>
      s.includes(key)
        ? s.filter((k) => k !== key)
        : s.length >= MAX_WEIGHTED_PRINCIPLES
          ? s
          : [...s, key],
    );
  }

  const tenOk = ten.trim().length >= MIN_TEN;
  const stepValid =
    step === 0
      ? true
      : step === 1
        ? tenOk
        : step === 2
          ? five.trim().length >= 10
          : step === 3
            ? six.trim().length >= 10
            : selected.length >= MIN_WEIGHTED_PRINCIPLES;

  function next() {
    setError(null);
    if (step < 4) setStep((s) => s + 1);
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await savePlan({
        ten_year_text: ten.trim(),
        five_year_text: five.trim(),
        six_month_milestone: six.trim(),
        principles: selected,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="px-3 pb-28 pt-6">
      {/* The house, rising as the plan comes together */}
      <HouseScene progress={build} realOverall={STEP_BUILD[step]} />
      <p className="type-caption mt-2 px-1 text-center text-graphite">
        {STEP_CAPTION[step]}
      </p>

      {/* Progress rail */}
      <div className="mt-4 flex gap-1.5 px-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-ink" : i === step ? "bg-blueprint" : "bg-shell",
            )}
          />
        ))}
      </div>

      <div className="relative mt-5 min-h-[300px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: reduce ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : -16 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {step === 0 ? <Intro /> : null}

            {step === 1 ? (
              <Field
                cap="THE VISION · 10-YEAR"
                title="What does the finished house look like?"
                help="Who are you becoming? A sentence or two, in your own words — no template."
                quote="“I wanted to come to the job site with a blueprint.”"
              >
                <Textarea
                  value={ten}
                  onChange={(e) => setTen(e.target.value)}
                  rows={6}
                  autoFocus
                  placeholder="In ten years I want to be the kind of leader who…"
                />
                <p
                  className={cn(
                    "type-caption mt-1 text-right",
                    tenOk ? "text-moss" : "text-graphite",
                  )}
                >
                  {ten.trim().length} / {MIN_TEN} min
                </p>
              </Field>
            ) : null}

            {step === 2 ? (
              <Field
                cap="THE BLUEPRINT · 5-YEAR"
                title="The major markers on the way."
                help="A few milestones that would tell you the vision is becoming real."
              >
                <Textarea
                  value={five}
                  onChange={(e) => setFive(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="In five years…"
                />
              </Field>
            ) : null}

            {step === 3 ? (
              <Field
                cap="THE BLUEPRINT · 6-MONTH"
                title="The first milestone you'll build toward."
                help="The checkpoint your next inspection measures against."
              >
                <Textarea
                  value={six}
                  onChange={(e) => setSix(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Six months from now…"
                />
              </Field>
            ) : null}

            {step === 4 ? (
              <Field
                cap="PRINCIPLES TO MASTER"
                title={`Pick ${MIN_WEIGHTED_PRINCIPLES} to ${MAX_WEIGHTED_PRINCIPLES}.`}
                help="Your inspections weight toward these. You can change them later."
              >
                <div className="mb-2 flex justify-end">
                  <span
                    className={cn(
                      "type-cap",
                      selected.length >= MIN_WEIGHTED_PRINCIPLES
                        ? "text-moss"
                        : "text-graphite",
                    )}
                  >
                    {selected.length} of {MIN_WEIGHTED_PRINCIPLES}–
                    {MAX_WEIGHTED_PRINCIPLES}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PRINCIPLES.map((p) => {
                    const on = selected.includes(p.key);
                    const full =
                      !on && selected.length >= MAX_WEIGHTED_PRINCIPLES;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(p.key)}
                        disabled={full}
                        className={cn(
                          "rounded-md border-[1.5px] px-3 py-2.5 text-left transition-colors",
                          on
                            ? "border-ink bg-ink text-chalk"
                            : full
                              ? "border-rule bg-transparent text-haze"
                              : "border-rule bg-chalk text-ink hover:border-ruleStrong",
                        )}
                      >
                        <div className="type-label">{p.name}</div>
                        <div
                          className={cn(
                            "type-caption mt-0.5 line-clamp-1",
                            on ? "text-chalk/60" : "text-graphite",
                          )}
                        >
                          {p.gloss}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {error ? <p className="type-caption mt-4 px-1 text-rust">{error}</p> : null}

      {/* Nav */}
      <div className="mt-6 flex items-center gap-3 px-1">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="lg" onClick={back} disabled={pending}>
            Back
          </Button>
        ) : null}
        <div className="flex-1" />
        {step === 0 ? (
          <Button size="lg" onClick={next}>
            Lay the foundation →
          </Button>
        ) : step < 4 ? (
          <Button size="lg" onClick={next} disabled={!stepValid}>
            Continue
          </Button>
        ) : (
          <Button size="lg" onClick={submit} disabled={pending || !stepValid}>
            {pending ? (
              <>
                <Spinner /> Pouring…
              </>
            ) : (
              "Pour the foundation"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div>
      <p className="type-cap text-oak-dim">YOUR BLUEPRINT</p>
      <h1 className="type-h1 mt-2 text-ink">Build your house.</h1>
      <p className="type-body mt-2 text-graphite">
        Plan your work, then work your plan. We&apos;ll turn your ten-year vision
        into something you can do today — and the house rises as you build.
      </p>

      <div className="mt-5 space-y-2">
        {STAGES.map((s, i) => (
          <div
            key={s.key}
            className="flex items-start gap-3 rounded-lg border border-dashed border-ruleStrong bg-chalk/60 p-3.5"
          >
            <span className="type-cap mt-0.5 w-4 shrink-0 text-graphite">
              {i + 1}
            </span>
            <div>
              <p className="type-label text-ink">{s.title}</p>
              <p className="type-caption mt-0.5 text-graphite">{s.blurb}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="type-caption mt-4 text-graphite">
        Takes about three minutes. One question at a time.
      </p>
    </div>
  );
}

function Field({
  cap,
  title,
  help,
  quote,
  children,
}: {
  cap: string;
  title: string;
  help: string;
  quote?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="type-cap text-blueprint">{cap}</p>
      <h2 className="type-h2 mt-1.5 text-ink">{title}</h2>
      <p className="type-body-sm mt-1.5 text-graphite">{help}</p>
      {quote ? (
        <p className="type-caption mt-2 italic text-oak-dim">{quote}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
