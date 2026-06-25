"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INSPECTION_LAYERS,
  MAX_WEIGHTED_PRINCIPLES,
  MIN_WEIGHTED_PRINCIPLES,
  PRINCIPLES,
  principleByKey,
  type InspectionLayer,
  type PrincipleKey,
} from "@/lib/inspection/principles";
import { saveGrowthOnboarding } from "./actions";

const TEN_YEAR_MIN = 200;

interface MappingRow {
  principle: PrincipleKey;
  layer: InspectionLayer;
  rationale: string;
  source: "ai" | "user";
}

const STEPS = ["Direction", "Milestones", "Principles", "Mapping", "Cascade"];

export function GrowthOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [tenYear, setTenYear] = useState("");
  const [fiveYear, setFiveYear] = useState("");
  const [sixMonth, setSixMonth] = useState("");
  const [principles, setPrinciples] = useState<PrincipleKey[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [mappingSource, setMappingSource] = useState<"ai" | "fallback" | null>(
    null,
  );
  const [monthly, setMonthly] = useState("");
  const [weekly, setWeekly] = useState("");
  const [daily, setDaily] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenYearOk = tenYear.trim().length >= TEN_YEAR_MIN;
  const milestonesOk = sixMonth.trim().length > 0;
  const principlesOk =
    principles.length >= MIN_WEIGHTED_PRINCIPLES &&
    principles.length <= MAX_WEIGHTED_PRINCIPLES;
  const mappingOk = mappings.length >= 1;
  const cascadeOk = monthly.trim().length > 0;

  function togglePrinciple(key: PrincipleKey) {
    setPrinciples((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      if (cur.length >= MAX_WEIGHTED_PRINCIPLES) return cur;
      return [...cur, key];
    });
  }

  async function runMapping() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inspection/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenYear: tenYear.trim(),
          fiveYear: fiveYear.trim() || undefined,
          sixMonth: sixMonth.trim() || undefined,
          principles,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not map your plan.");
      }
      const data = (await res.json()) as {
        suggestions: MappingRow[];
        source: "ai" | "fallback";
      };
      setMappings(
        data.suggestions.map((s) => ({
          principle: s.principle,
          layer: s.layer,
          rationale: s.rationale,
          source: "ai",
        })),
      );
      setMappingSource(data.source);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not map your plan.");
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(principle: PrincipleKey, patch: Partial<MappingRow>) {
    setMappings((cur) =>
      cur.map((m) =>
        m.principle === principle ? { ...m, ...patch, source: "user" } : m,
      ),
    );
  }

  function removeMapping(principle: PrincipleKey) {
    setMappings((cur) => cur.filter((m) => m.principle !== principle));
  }

  function addMapping(principle: PrincipleKey) {
    setMappings((cur) => {
      if (cur.some((m) => m.principle === principle)) return cur;
      const next: MappingRow = {
        principle,
        layer: "frame",
        rationale: "",
        source: "user",
      };
      return [...cur, next].sort(
        (a, b) =>
          principleByKey(a.principle).order - principleByKey(b.principle).order,
      );
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await saveGrowthOnboarding({
      tenYear: tenYear.trim(),
      fiveYear: fiveYear.trim() || undefined,
      sixMonth: sixMonth.trim(),
      principles,
      mappings: mappings.map((m) => ({
        principle: m.principle,
        layer: m.layer,
        rationale: m.rationale.trim(),
        source: m.source,
      })),
      monthly: monthly.trim(),
      weekly: weekly.trim() || undefined,
      daily: daily.trim() || undefined,
    });
    if (result.ok) {
      router.push("/app");
      return;
    }
    setError(result.error);
    setBusy(false);
  }

  const unmapped = PRINCIPLES.filter(
    (p) => !mappings.some((m) => m.principle === p.key),
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="mb-8">
        <p className="type-cap text-haze">Growth Inspection</p>
        <h1 className="type-h1 text-ink">Set up your inspection</h1>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-ink" : "bg-rule"
              }`}
              aria-label={label}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-haze">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-rust bg-rust/5 px-4 py-3 text-sm text-rust">
          {error}
        </div>
      )}

      {/* Step 0 — ten-year direction */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="type-h2 text-ink">Where are you headed in ten years?</h2>
            <p className="mt-1 text-ink2">
              Write it in your own words. Not a resume, a direction. Who are you
              becoming, and what does the work look like when you get there.
            </p>
          </div>
          <div>
            <Textarea
              value={tenYear}
              onChange={(e) => setTenYear(e.target.value)}
              placeholder="In ten years I want to..."
              className="min-h-[200px]"
            />
            <p
              className={`mt-2 text-sm ${
                tenYearOk ? "text-haze" : "text-ink2"
              }`}
            >
              {tenYear.trim().length} characters. Aim for at least {TEN_YEAR_MIN}{" "}
              so there is enough to read.
            </p>
          </div>
          <div className="flex justify-end">
            <Button disabled={!tenYearOk} onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 1 — five-year + six-month, anchored to ten-year */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <PlanAnchor label="Your ten-year direction" text={tenYear} />
          <div>
            <Label htmlFor="fiveYear">Five-year plan</Label>
            <p className="mb-2 mt-1 text-sm text-ink2">
              The major milestones on the way there. Optional, but it sharpens
              the read.
            </p>
            <Textarea
              id="fiveYear"
              value={fiveYear}
              onChange={(e) => setFiveYear(e.target.value)}
              placeholder="In five years..."
            />
          </div>
          <div>
            <Label htmlFor="sixMonth">Six-month milestone</Label>
            <p className="mb-2 mt-1 text-sm text-ink2">
              The checkpoint your first inspection measures against. One clear
              thing.
            </p>
            <Textarea
              id="sixMonth"
              value={sixMonth}
              onChange={(e) => setSixMonth(e.target.value)}
              placeholder="In six months I will have..."
              className="min-h-[120px]"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button disabled={!milestonesOk} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — principle selection */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="type-h2 text-ink">
              Which principles do you most want to master?
            </h2>
            <p className="mt-1 text-ink2">
              Pick {MIN_WEIGHTED_PRINCIPLES} to {MAX_WEIGHTED_PRINCIPLES}. Your
              inspection weights toward these and takes a light reading on the
              rest.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRINCIPLES.map((p) => {
              const selected = principles.includes(p.key);
              const atMax =
                !selected && principles.length >= MAX_WEIGHTED_PRINCIPLES;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePrinciple(p.key)}
                  disabled={atMax}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    selected
                      ? "border-ink bg-ink text-chalk"
                      : atMax
                        ? "border-rule bg-chalk text-haze"
                        : "border-rule bg-chalk text-ink hover:bg-paper2"
                  }`}
                >
                  <span className="block font-medium">{p.name}</span>
                  <span
                    className={`mt-0.5 block text-sm ${
                      selected ? "text-chalk/70" : "text-ink2"
                    }`}
                  >
                    {p.gloss}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-haze">
            {principles.length} selected.
          </p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!principlesOk || busy} onClick={runMapping}>
              {busy ? "Reading your plan..." : "Map my plan"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — AI mapping confirmation */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="type-h2 text-ink">Here is how we read your plan</h2>
            <p className="mt-1 text-ink2">
              {mappingSource === "fallback"
                ? "We could not reach the mapping model, so this is a starting point built from the principles you chose. Adjust anything. You have the final say."
                : "This is a reading, not a verdict. Change a layer, edit the note, remove one, or add a principle. You have the final say."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {mappings.map((m) => {
              const def = principleByKey(m.principle);
              return (
                <Card key={m.principle} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-medium text-ink">{def.name}</span>
                      <span className="ml-2 text-sm text-haze">{def.gloss}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMapping(m.principle)}
                      className="text-sm text-rust hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Label
                      htmlFor={`layer-${m.principle}`}
                      className="text-sm text-ink2"
                    >
                      Layer
                    </Label>
                    <select
                      id={`layer-${m.principle}`}
                      value={m.layer}
                      onChange={(e) =>
                        updateMapping(m.principle, {
                          layer: e.target.value as InspectionLayer,
                        })
                      }
                      className="rounded-md border-[1.5px] border-rule bg-chalk px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none"
                    >
                      {INSPECTION_LAYERS.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    value={m.rationale}
                    onChange={(e) =>
                      updateMapping(m.principle, { rationale: e.target.value })
                    }
                    className="mt-3 min-h-[80px] text-[15px]"
                    placeholder="Why this principle connects to your plan"
                  />
                </Card>
              );
            })}
          </div>

          {unmapped.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-ink2">Add a principle</p>
              <div className="flex flex-wrap gap-2">
                {unmapped.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => addMapping(p.key)}
                    className="rounded-full border border-rule bg-chalk px-3 py-1 text-sm text-ink hover:bg-paper2"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button disabled={!mappingOk} onClick={() => setStep(4)}>
              This looks right
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — the starting cascade */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="type-h2 text-ink">Set your first work orders</h2>
            <p className="mt-1 text-ink2">
              Each one should ladder up to the milestone above it. Start small.
              You will refine these as you work.
            </p>
          </div>
          <PlanAnchor label="Six-month milestone" text={sixMonth} />
          <div>
            <Label htmlFor="monthly">This month</Label>
            <p className="mb-2 mt-1 text-sm text-ink2">
              The building phase that moves you toward the milestone.
            </p>
            <Input
              id="monthly"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="This month I will..."
            />
          </div>
          <div>
            <Label htmlFor="weekly">This week</Label>
            <p className="mb-2 mt-1 text-sm text-ink2">
              The work order under this month. Optional.
            </p>
            <Input
              id="weekly"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
              placeholder="This week I will..."
            />
          </div>
          <div>
            <Label htmlFor="daily">Today</Label>
            <p className="mb-2 mt-1 text-sm text-ink2">
              One task on the site. Optional.
            </p>
            <Input
              id="daily"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              placeholder="Today I will..."
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button disabled={!cascadeOk || busy} onClick={submit}>
              {busy ? "Saving..." : "Finish setup"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function PlanAnchor({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-ruleStrong bg-paper2 px-4 py-3">
      <p className="type-cap text-haze">{label}</p>
      <p className="mt-1 line-clamp-3 text-sm text-ink2">{text}</p>
    </div>
  );
}
