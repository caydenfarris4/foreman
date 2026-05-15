"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completeOnboarding } from "./actions";

const STEPS = [
  {
    title: "Who you are",
    description: "Just the basics. We'll use your name in coaching.",
  },
  {
    title: "Your role",
    description: "The role you're stepping into. The harder it is, the better the coaching gets.",
  },
  {
    title: "Your team",
    description: "Size and shape. Context the foreman needs before walking the site.",
  },
  {
    title: "What's hard right now",
    description: "One challenge you're carrying. Be specific — vague problems get vague coaching.",
  },
  {
    title: "Your rhythm",
    description: "When we show up in your morning, and the day you rest. Foreman pauses on the day you choose to rest. Take it.",
  },
] as const;

const SABBATH_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "none", label: "No pause" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface Props {
  email: string;
  error?: string;
}

export function OnboardingWizard({ email, error }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    current_role: "",
    promoted_at: "",
    team_size: 0,
    team_context: "",
    industry: "",
    current_challenge: "",
    sabbath_day: "sunday",
    notification_time: "07:00",
    timezone: "America/Denver",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return form.name.trim().length > 0;
      case 1:
        return form.current_role.trim().length > 0;
      case 2:
        return form.team_size >= 0 && form.team_context.trim().length > 0;
      case 3:
        return form.current_challenge.trim().length > 0;
      case 4:
        return (
          !!form.sabbath_day &&
          /^\d{2}:\d{2}$/.test(form.notification_time) &&
          form.timezone.trim().length > 0
        );
      default:
        return false;
    }
  }, [step, form]);

  const isLast = step === STEPS.length - 1;

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
          <CardTitle className="font-serif text-2xl">
            {STEPS[step].title}
          </CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={completeOnboarding}
            className="space-y-6"
            onSubmit={(e) => {
              if (!isLast) {
                e.preventDefault();
                if (stepValid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
              }
            }}
          >
            {/* Hidden snapshot of all values so a single submit at step 5 carries everything */}
            <input type="hidden" name="name" value={form.name} />
            <input type="hidden" name="current_role" value={form.current_role} />
            <input type="hidden" name="promoted_at" value={form.promoted_at} />
            <input type="hidden" name="team_size" value={String(form.team_size)} />
            <input type="hidden" name="team_context" value={form.team_context} />
            <input type="hidden" name="industry" value={form.industry} />
            <input
              type="hidden"
              name="current_challenge"
              value={form.current_challenge}
            />
            <input type="hidden" name="sabbath_day" value={form.sabbath_day} />
            <input
              type="hidden"
              name="notification_time"
              value={form.notification_time}
            />
            <input type="hidden" name="timezone" value={form.timezone} />

            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium">{email}</span>.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="display-name">What should we call you?</Label>
                  <Input
                    id="display-name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    autoComplete="given-name"
                    autoFocus
                    placeholder="First name is fine"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Your current role</Label>
                  <Input
                    id="role"
                    value={form.current_role}
                    onChange={(e) => update("current_role", e.target.value)}
                    autoFocus
                    placeholder="e.g. Engineering Manager, Store Lead"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promoted">When did you step in?</Label>
                    <Input
                      id="promoted"
                      type="date"
                      value={form.promoted_at}
                      onChange={(e) => update("promoted_at", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Optional.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(e) => update("industry", e.target.value)}
                      placeholder="e.g. SaaS, retail, healthcare"
                    />
                    <p className="text-xs text-muted-foreground">Optional.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-size">How many people report to you?</Label>
                  <Input
                    id="team-size"
                    type="number"
                    min={0}
                    max={500}
                    value={form.team_size}
                    onChange={(e) =>
                      update("team_size", Number.isFinite(e.target.valueAsNumber)
                        ? e.target.valueAsNumber
                        : 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-context">Who's on the team?</Label>
                  <Textarea
                    id="team-context"
                    value={form.team_context}
                    onChange={(e) => update("team_context", e.target.value)}
                    placeholder="Senior engineer, two juniors hired three months ago, one designer on loan from another team..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Tenure, seniority, anything that affects how you have to lead them.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="challenge">
                  What's the hardest thing on your plate right now?
                </Label>
                <Textarea
                  id="challenge"
                  value={form.current_challenge}
                  onChange={(e) => update("current_challenge", e.target.value)}
                  autoFocus
                  rows={6}
                  placeholder="Be specific. 'My senior dev has been disengaged since I was promoted over him' beats 'team morale.'"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="time">Daily prompt time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={form.notification_time}
                      onChange={(e) => update("notification_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tz">Timezone</Label>
                    <select
                      id="tz"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.timezone}
                      onChange={(e) => update("timezone", e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sabbath day</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SABBATH_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => update("sabbath_day", opt.value)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          form.sabbath_day === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input hover:bg-secondary"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Foreman pauses on the day you choose to rest. Take it.
                  </p>
                </div>
              </div>
            )}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              <Button type="submit" disabled={!stepValid}>
                {isLast ? "Start building" : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
