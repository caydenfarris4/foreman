"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StampChip } from "@/components/ui/stamp-chip";
import { Wordmark } from "@/components/ui/wordmark";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import { completeOnboarding } from "./actions";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["IDENTITY", "CHALLENGE", "CADENCE"] as const;

const MONTH_OPTIONS = [
  { value: "0-3", label: "0–3 months", sub: "Brand new" },
  { value: "4-6", label: "4–6 months", sub: "Past the honeymoon" },
  { value: "7-9", label: "7–9 months", sub: "" },
  { value: "10-12", label: "10–12 months", sub: "" },
] as const;

const TEAM_OPTIONS = ["1–3", "4–6", "7–10", "11+"] as const;
const TEAM_VALUES = ["1-3", "4-6", "7-10", "11+"] as const;

const CHALLENGES = [
  {
    id: "feedback",
    label: "Giving hard feedback",
    sub: "Telling the truth when it costs you",
  },
  {
    id: "delegation",
    label: "Letting go of the work",
    sub: "You're still doing IC work after hours",
  },
  {
    id: "conflict",
    label: "Conflict on the team",
    sub: "Two people, one stuck thing",
  },
  {
    id: "underperformer",
    label: "A struggling report",
    sub: "You know who. You've known for weeks.",
  },
  {
    id: "scope",
    label: "Saying no to scope",
    sub: "Your team is doing the work of 1.5 teams",
  },
  {
    id: "manager",
    label: "Managing up",
    sub: "Your boss is the bottleneck",
  },
] as const;

const TIME_OPTIONS = [
  { value: "06:30", sub: "before stand-up" },
  { value: "07:15", sub: "over coffee" },
  { value: "21:00", sub: "after the day" },
] as const;

const RETRO_DAYS = ["friday", "saturday", "sunday", "monday"] as const;
const RETRO_LABEL: Record<string, string> = {
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
  monday: "Mon",
};

interface Props {
  email: string;
  error?: string;
}

export function OnboardingWizard({ email, error }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    current_role: "",
    months_managing: "" as "" | (typeof MONTH_OPTIONS)[number]["value"],
    team_size_bucket: "" as "" | (typeof TEAM_VALUES)[number],
    challenge: "" as "" | (typeof CHALLENGES)[number]["id"],
    notification_time: "07:15",
    retro_day: "sunday" as (typeof RETRO_DAYS)[number],
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver",
  });

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return (
          form.name.trim().length > 0 &&
          form.current_role.trim().length > 0 &&
          form.months_managing !== "" &&
          form.team_size_bucket !== ""
        );
      case 2:
        return form.challenge !== "";
      case 3:
        return (
          /^\d{2}:\d{2}$/.test(form.notification_time) &&
          !!form.retro_day &&
          form.timezone.trim().length > 0
        );
      default:
        return false;
    }
  }, [step, form]);

  const isLast = step === 3;

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <div className="container max-w-xl pt-12">
        <div className="mb-5 flex items-center justify-between">
          <Wordmark />
          <span className="type-cap text-graphite">SETTING UP YOUR SITE</span>
        </div>
        <SegmentedProgress
          current={step}
          total={3}
          label={`STEP ${String(step).padStart(2, "0")} OF 03 · ${STEP_LABELS[step - 1]}`}
        />
      </div>

      <form
        action={completeOnboarding}
        className="container max-w-xl flex-1 pb-32 pt-8"
        onSubmit={(e) => {
          if (!isLast) {
            e.preventDefault();
            if (stepValid) setStep((s) => Math.min(3, s + 1));
          }
        }}
      >
        {/* Hidden snapshot — single submit on step 3 carries everything */}
        <input type="hidden" name="name" value={form.name} />
        <input type="hidden" name="current_role" value={form.current_role} />
        <input type="hidden" name="months_managing" value={form.months_managing} />
        <input
          type="hidden"
          name="team_size_bucket"
          value={form.team_size_bucket}
        />
        <input type="hidden" name="challenge" value={form.challenge} />
        <input
          type="hidden"
          name="notification_time"
          value={form.notification_time}
        />
        <input type="hidden" name="retro_day" value={form.retro_day} />
        <input type="hidden" name="timezone" value={form.timezone} />

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="type-h1 text-ink">Who&apos;s running this site?</h1>
              <p className="type-body mt-2 text-graphite">
                We use your name and a couple of facts to sharpen the coaching.
                Nothing more. Signed in as{" "}
                <span className="text-ink2">{email}</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="display-name" className="type-label text-ink2">
                Name
              </label>
              <Input
                id="display-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="given-name"
                autoFocus
                placeholder="First name is fine"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="type-label text-ink2">
                Role title
              </label>
              <Input
                id="role"
                value={form.current_role}
                onChange={(e) => update("current_role", e.target.value)}
                placeholder="e.g. Engineering Manager, Store Lead"
              />
            </div>

            <div className="space-y-3">
              <label className="type-label text-ink2">
                When did you start managing?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MONTH_OPTIONS.map((opt) => (
                  <StampChip
                    key={opt.value}
                    label={opt.label}
                    sub={opt.sub || undefined}
                    selected={form.months_managing === opt.value}
                    onClick={() => update("months_managing", opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="type-label text-ink2">Team size</label>
              <div className="flex gap-2">
                {TEAM_OPTIONS.map((label, i) => (
                  <StampChip
                    key={label}
                    label={label}
                    centered
                    selected={form.team_size_bucket === TEAM_VALUES[i]}
                    onClick={() => update("team_size_bucket", TEAM_VALUES[i])}
                    className="flex-1"
                  />
                ))}
              </div>
              <p className="type-caption text-graphite">
                Direct reports only. Skip-level folks don&apos;t count.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="type-h1 text-ink">
                What&apos;s the heaviest thing on your site right now?
              </h1>
              <p className="type-body mt-2 text-graphite">
                We&apos;ll bias your early coaching toward this. You can change
                it any time.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {CHALLENGES.map((opt, i) => {
                const selected = form.challenge === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("challenge", opt.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border-[1.5px] px-4 py-3.5 text-left transition-colors",
                      selected
                        ? "border-ink bg-ink text-chalk"
                        : "border-rule bg-chalk text-ink hover:border-ruleStrong",
                    )}
                  >
                    <span
                      className={cn(
                        "type-spec mt-0.5 w-5 shrink-0",
                        selected ? "text-oak" : "text-graphite",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div
                        className={cn(
                          "type-label",
                          selected ? "text-chalk" : "text-ink",
                        )}
                      >
                        {opt.label}
                      </div>
                      <div
                        className={cn(
                          "type-caption mt-0.5",
                          selected ? "text-chalk/60" : "text-graphite",
                        )}
                      >
                        {opt.sub}
                      </div>
                    </div>
                    {selected ? (
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-oak text-ink">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 10l4 4 8-8" />
                        </svg>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="type-h1 text-ink">When do you want the prompt?</h1>
              <p className="type-body mt-2 text-graphite">
                One reminder a day. We&apos;ll send it to your phone at this
                time. No streaks, no shame.
              </p>
            </div>

            <div className="space-y-3">
              <label className="type-label text-ink2">Daily check-in</label>
              <div className="flex gap-2">
                {TIME_OPTIONS.map((opt) => {
                  const selected = form.notification_time === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("notification_time", opt.value)}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-md border-[1.5px] px-3 py-3.5 transition-colors",
                        selected
                          ? "border-ink bg-ink text-chalk"
                          : "border-rule bg-chalk text-ink hover:border-ruleStrong",
                      )}
                    >
                      <span className="type-h2">{opt.value}</span>
                      <span
                        className={cn(
                          "type-caption",
                          selected ? "text-chalk/60" : "text-graphite",
                        )}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-1">
                <label htmlFor="custom-time" className="type-caption text-graphite">
                  Or pick a custom time
                </label>
                <Input
                  id="custom-time"
                  type="time"
                  value={form.notification_time}
                  onChange={(e) => update("notification_time", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="type-label text-ink2">
                Weekly retrospective
              </label>
              <div className="flex gap-2">
                {RETRO_DAYS.map((d) => (
                  <StampChip
                    key={d}
                    label={RETRO_LABEL[d]}
                    centered
                    selected={form.retro_day === d}
                    onClick={() => update("retro_day", d)}
                    className="flex-1"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-md border border-oak bg-oak-wash p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-oak text-chalk">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10l4 4 8-8" />
                  </svg>
                </div>
                <div>
                  <div className="type-label text-oak-dim">
                    One ritual. That&apos;s the whole app.
                  </div>
                  <p className="type-caption mt-1 text-ink2">
                    Five minutes in the morning, twenty on retro day. If we
                    ever ask for more, push back.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="type-caption mt-6 text-rust">{error}</p>
        ) : null}

        <div className="mt-10 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          <div className="flex-1" />
          <Button type="submit" size="lg" disabled={!stepValid}>
            {isLast ? "Open the site" : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  );
}
