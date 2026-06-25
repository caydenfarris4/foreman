"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MAX_WEIGHTED_PRINCIPLES,
  MIN_WEIGHTED_PRINCIPLES,
  PRINCIPLES,
} from "@/lib/inspection/principles";
import { savePlan } from "./actions";

export interface BlueprintInitial {
  ten_year_text: string;
  five_year_text: string;
  six_month_milestone: string;
  principles: string[];
}

const MIN_TEN = 200;

export function BlueprintForm({
  initial,
  onSaved,
}: {
  initial: BlueprintInitial | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [ten, setTen] = useState(initial?.ten_year_text ?? "");
  const [five, setFive] = useState(initial?.five_year_text ?? "");
  const [six, setSix] = useState(initial?.six_month_milestone ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.principles ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
  const enough = selected.length >= MIN_WEIGHTED_PRINCIPLES;
  const canSave =
    tenOk && five.trim().length >= 10 && six.trim().length >= 10 && enough;

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
      onSaved?.();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="ten" className="type-label text-ink2">
          Ten-year direction
        </label>
        <p className="type-caption mt-1 text-graphite">
          Who are you becoming? Write it in your own words. No template. At least
          a paragraph.
        </p>
        <Textarea
          id="ten"
          value={ten}
          onChange={(e) => setTen(e.target.value)}
          rows={6}
          className="mt-2"
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
      </div>

      {ten.trim() ? (
        <div className="rounded-md border border-rule bg-paper2/40 px-4 py-3">
          <p className="type-cap text-graphite">ANCHORED TO YOUR TEN-YEAR</p>
          <p className="type-body-sm mt-1 line-clamp-2 text-ink2">{ten.trim()}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="five" className="type-label text-ink2">
          Five-year milestones
        </label>
        <p className="type-caption mt-1 text-graphite">
          The major markers on the way to the ten-year direction.
        </p>
        <Textarea
          id="five"
          value={five}
          onChange={(e) => setFive(e.target.value)}
          rows={3}
          className="mt-2"
          placeholder="In five years…"
        />
      </div>

      <div>
        <label htmlFor="six" className="type-label text-ink2">
          Six-month milestone
        </label>
        <p className="type-caption mt-1 text-graphite">
          The checkpoint your next inspection measures against.
        </p>
        <Textarea
          id="six"
          value={six}
          onChange={(e) => setSix(e.target.value)}
          rows={3}
          className="mt-2"
          placeholder="Six months from now…"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="type-label text-ink2">
            Principles to master
          </label>
          <span
            className={cn(
              "type-cap",
              enough ? "text-moss" : "text-graphite",
            )}
          >
            {selected.length} of {MIN_WEIGHTED_PRINCIPLES}–{MAX_WEIGHTED_PRINCIPLES}
          </span>
        </div>
        <p className="type-caption mt-1 text-graphite">
          Pick {MIN_WEIGHTED_PRINCIPLES} to {MAX_WEIGHTED_PRINCIPLES}. Your
          inspections weight toward these.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRINCIPLES.map((p) => {
            const on = selected.includes(p.key);
            const full = !on && selected.length >= MAX_WEIGHTED_PRINCIPLES;
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
      </div>

      {error ? <p className="type-caption text-rust">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !canSave} size="lg">
          {pending ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save blueprint"
          )}
        </Button>
        {!canSave ? (
          <span className="type-caption text-graphite">
            {!tenOk
              ? "Ten-year needs 200+ characters."
              : !enough
                ? `Pick ${MIN_WEIGHTED_PRINCIPLES}+ principles.`
                : "Fill in five-year and six-month."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
