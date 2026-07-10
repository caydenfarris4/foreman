"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Draft {
  application_text: string;
  why_joining: string;
  current_team_size: string;
  current_challenge: string;
  agreed_to_commitment: boolean;
}

const EMPTY: Draft = {
  application_text: "",
  why_joining: "",
  current_team_size: "",
  current_challenge: "",
  agreed_to_commitment: false,
};

export function ApplyForm({
  cohortId,
  cohortSlug,
  initialName,
}: {
  cohortId: string;
  cohortSlug: string;
  initialName: string;
}) {
  const router = useRouter();
  const storageKey = `cohort-application-draft-${cohortSlug}`;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  // Restore draft on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      // ignore corrupt JSON
    }
  }, [storageKey]);

  // Save draft on every change. Debounced via the layout effect cadence.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (submitted) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // localStorage full / disabled — silent
    }
  }, [draft, storageKey, submitted]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const step0Done = draft.application_text.trim().length >= 40;
  const step1Done = draft.current_challenge.trim().length >= 10;
  const step2Done = draft.agreed_to_commitment;
  const canSubmit = step0Done && step1Done && step2Done;

  async function submit() {
    if (!canSubmit) {
      setError("Finish each step before sending.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cohorts/${cohortSlug}/apply`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            application_text: draft.application_text.trim(),
            why_joining: draft.why_joining.trim() || undefined,
            current_team_size: draft.current_team_size
              ? Number(draft.current_team_size)
              : undefined,
            current_challenge: draft.current_challenge.trim() || undefined,
            agreed_to_commitment: true,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error ?? "Could not submit. Try again.");
          return;
        }
        setSubmitted(true);
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        router.refresh();
      } catch {
        setError("Network problem. Your draft is saved — try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-lg border border-rule bg-chalk p-6">
        <p className="type-cap text-oak-dim">APPLICATION RECEIVED</p>
        <h2 className="type-h2 mt-2 text-ink">
          Got it{initialName ? `, ${initialName}` : ""}.
        </h2>
        <p className="type-body mt-3 text-ink2">
          Cayden reviews every application personally. Expect a response
          within 5 business days at the email tied to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Progress strip */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-md border px-3 py-2 text-left transition-colors ${
              i === step
                ? "border-ink bg-ink text-chalk"
                : i < step ||
                    (i === 0 && step0Done) ||
                    (i === 1 && step1Done) ||
                    (i === 2 && step2Done)
                  ? "border-rule bg-chalk text-ink"
                  : "border-rule bg-transparent text-graphite"
            }`}
          >
            <span className="type-cap block opacity-70">
              0{i + 1}
            </span>
            <span className="type-label">{s.label}</span>
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4 rounded-lg border border-rule bg-chalk p-5">
          <div>
            <label className="type-label text-ink">
              Tell us about a situation you&apos;re wrestling with right
              now — the one you keep thinking about between meetings.
            </label>
            <p className="type-caption mt-1 text-graphite">
              At least a paragraph. The more specific, the better Cayden
              can tell whether this cohort is the right fit.
            </p>
            <Textarea
              value={draft.application_text}
              onChange={(e) => update("application_text", e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder="A senior on my team has been quietly disengaged for two weeks. I keep avoiding the 1:1 because I don't know what to say. Last time I tried, I ended up making it about me."
            />
            <p className="type-caption mt-1 text-graphite">
              {draft.application_text.trim().length} / 4000 characters
              {step0Done ? null : " — keep going, 40 minimum"}
            </p>
          </div>
          <div>
            <label className="type-label text-ink">
              Why this cohort, why now? (optional)
            </label>
            <Textarea
              value={draft.why_joining}
              onChange={(e) => update("why_joining", e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="What's the change you want to walk out of week 8 having made?"
            />
          </div>
          <NextStep
            onClick={() => setStep(1)}
            disabled={!step0Done}
            label="Next: your context →"
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-lg border border-rule bg-chalk p-5">
          <div>
            <label className="type-label text-ink">
              How big is your team right now?
            </label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              value={draft.current_team_size}
              onChange={(e) => update("current_team_size", e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <label className="type-label text-ink">
              The single biggest challenge in front of you this quarter.
            </label>
            <p className="type-caption mt-1 text-graphite">
              One sentence is fine. Pick the one that&apos;s actually
              keeping you up.
            </p>
            <Textarea
              value={draft.current_challenge}
              onChange={(e) => update("current_challenge", e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Turning around an underperforming senior without firing them."
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
            >
              ← Back
            </button>
            <NextStep
              onClick={() => setStep(2)}
              disabled={!step1Done}
              label="Next: the commitment →"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5 rounded-lg border border-rule bg-chalk p-5">
          <div>
            <p className="type-cap text-graphite">THE COMMITMENT</p>
            <ul className="mt-3 space-y-2">
              {[
                "Eight 90-minute Saturday sessions, 10am Mountain Time. Miss 3+ and no completion certificate.",
                "Show up with real situations, not theoretical ones.",
                "Confidentiality both ways — what's said in cohort stays in cohort.",
                "Refund: full refund before session 2. After that, no refund.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 type-body-sm text-ink2"
                >
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-oak" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-rule bg-paper2/40 p-3">
            <input
              type="checkbox"
              checked={draft.agreed_to_commitment}
              onChange={(e) => update("agreed_to_commitment", e.target.checked)}
              className="mt-1"
            />
            <span className="type-body-sm text-ink2">
              I&apos;ve read the commitment above and I&apos;m in.
            </span>
          </label>

          {error ? (
            <p className="type-caption text-rust">{error}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
            >
              ← Back
            </button>
            <Button
              type="button"
              size="lg"
              onClick={submit}
              disabled={!canSubmit || pending}
            >
              {pending ? (
                <>
                  <Spinner /> Sending
                </>
              ) : (
                "Submit application"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <p className="type-caption text-graphite">
        Your draft is saved automatically. Close the tab and come back —
        what you&apos;ve written will still be here.
      </p>
    </div>
  );
}

const STEPS = [
  { key: "context", label: "Your situation" },
  { key: "team", label: "Your team" },
  { key: "commit", label: "The commitment" },
];

function NextStep({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="md"
      onClick={onClick}
      disabled={disabled}
      variant="primary"
    >
      {label}
    </Button>
  );
}
