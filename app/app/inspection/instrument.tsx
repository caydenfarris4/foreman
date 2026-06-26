"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FREQUENCY_OPTIONS,
  type InstrumentQuestion,
} from "@/lib/inspection/questions";

const SLIDER_LABELS = ["Not at all", "Rarely", "Sometimes", "Mostly", "Fully"];
const FREQ_LABELS: Record<string, string> = {
  never: "Never",
  rarely: "Rarely",
  sometimes: "Sometimes",
  often: "Often",
  always: "Always",
};

export function Instrument({ questions }: { questions: InstrumentQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<
    null | { routed: boolean; report: string | null }
  >(null);

  function set(key: string, value: unknown) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setError(null);
  }

  const answeredCount = questions.filter((q) => q.key in answers).length;
  const allAnswered = answeredCount === questions.length;

  function submit() {
    if (!allAnswered) {
      setError("Answer every question before you submit the walk-through.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/inspection/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Something broke on our end.");
          return;
        }
        setDone({ routed: json.routed, report: json.report });
        router.refresh();
      } catch {
        setError("Network problem. Your answers are still here. Try again.");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-rule bg-chalk p-6 text-center">
        {done.routed ? (
          <>
            <p className="type-cap text-oak-dim">IN REVIEW</p>
            <h2 className="type-h2 mt-2 text-ink">Your walk-through is in.</h2>
            <p className="type-body mt-2 text-graphite">
              This report is getting a personal review before it reaches you.
              You will see it here when it is ready.
            </p>
          </>
        ) : (
          <>
            <p className="type-cap text-moss">FILED</p>
            <h2 className="type-h2 mt-2 text-ink">Your report is ready.</h2>
            <p className="type-body mt-2 text-graphite">Reloading it now.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <fieldset
          key={q.key}
          className="rounded-lg border border-rule bg-chalk p-4"
        >
          <legend className="sr-only">{q.body}</legend>
          <div className="flex gap-3">
            <span className="type-spec text-graphite">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="type-body text-ink">{q.body}</p>
          </div>
          <div className="mt-3 pl-7">
            {q.type === "slider" ? (
              <div className="grid grid-cols-5 gap-1.5">
                {SLIDER_LABELS.map((label, idx) => {
                  const v = idx + 1;
                  const on = answers[q.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set(q.key, v)}
                      className={cn(
                        "rounded-md border px-1 py-2 text-center transition-colors",
                        on
                          ? "border-ink bg-ink text-chalk"
                          : "border-rule bg-transparent text-ink2 hover:bg-paper2/50",
                      )}
                    >
                      <span className="type-caption block">{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : q.type === "frequency" ? (
              <div className="flex flex-wrap gap-1.5">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const on = answers[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(q.key, opt)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 transition-colors",
                        on
                          ? "border-ink bg-ink text-chalk"
                          : "border-rule bg-transparent text-ink2 hover:bg-paper2/50",
                      )}
                    >
                      <span className="type-label">{FREQ_LABELS[opt]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {q.options?.map((opt) => {
                  const on = answers[q.key] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => set(q.key, opt.key)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                        on
                          ? "border-ink bg-ink text-chalk"
                          : "border-rule bg-transparent text-ink2 hover:bg-paper2/50",
                      )}
                    >
                      <span className="type-body-sm">{opt.body}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </fieldset>
      ))}

      {error ? <p className="type-caption px-1 text-rust">{error}</p> : null}

      <div className="sticky bottom-24 flex items-center gap-3 rounded-lg border border-rule bg-paper/95 p-3 backdrop-blur">
        <span className="type-caption text-graphite">
          {answeredCount} / {questions.length} answered
        </span>
        <div className="flex-1" />
        <Button onClick={submit} disabled={pending || !allAnswered} size="lg">
          {pending ? (
            <>
              <Spinner /> Building the report…
            </>
          ) : (
            "Submit walk-through"
          )}
        </Button>
      </div>
    </div>
  );
}
