"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { saveJournalEntry } from "../journal/actions";

interface Props {
  checkinDate: string;
  promptText: string;
  existingResponse: string | null;
  existingCoaching: string | null;
  existingPhase: string | null;
  existingTags: string[] | null;
}

const PHASE_BADGE: Record<string, "blueprint" | "oak" | "moss"> = {
  foundation: "blueprint",
  framing: "oak",
  finishing: "moss",
};

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function ForemanBadge() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[3px] bg-oak"
        aria-hidden
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1h6v2H3v6H1V1z" fill="#3a352e" />
        </svg>
      </span>
      <span className="type-cap text-oak">FOREMAN</span>
    </div>
  );
}

export function CheckinForm({
  checkinDate,
  promptText,
  existingResponse,
  existingCoaching,
  existingPhase,
  existingTags,
}: Props) {
  const router = useRouter();
  const [response, setResponse] = useState(existingResponse ?? "");
  const [coaching, setCoaching] = useState(existingCoaching);
  const [phase, setPhase] = useState(existingPhase);
  const [tags, setTags] = useState<string[]>(existingTags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const trimmed = response.trim();
    if (trimmed.length < 20) {
      setError(
        "Give the foreman more than a sentence to work with — at least 20 characters.",
      );
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/checkin/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            checkin_date: checkinDate,
            prompt_text: promptText,
            user_response: trimmed,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Something broke on our end.");
          return;
        }
        setCoaching(json.coaching);
        setPhase(json.phase ?? null);
        setTags(json.tags ?? []);
        router.refresh();
      } catch {
        setError(
          "Network problem. Your response is still in this field — try again.",
        );
      }
    });
  }

  const dateLabel = new Date(`${checkinDate}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();

  const wordCount = response.trim().length
    ? response.trim().split(/\s+/).length
    : 0;
  const paragraphs = response
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;

  return (
    <div className="space-y-5 px-3 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <span className="type-cap text-oak-dim">COACH · DAILY CHECK-IN</span>
        <span className="type-cap text-graphite">{dateLabel}</span>
      </div>

      {/* The prompt — italic serif quote with oak rule */}
      <div className="flex gap-4">
        <div className="w-[2px] shrink-0 rounded-[1px] bg-oak" />
        <p className="type-prompt text-[24px] text-ink">{promptText}</p>
      </div>

      {coaching ? (
        <>
          {/* User's own check-in, collapsed */}
          <div className="rounded-lg border border-rule bg-chalk p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="type-cap text-graphite">YOU</span>
              <span className="type-caption text-graphite">
                {paragraphs || 1} paragraph{paragraphs === 1 ? "" : "s"} ·{" "}
                {wordCount} word{wordCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="type-body whitespace-pre-wrap text-ink2">
              {response}
            </p>
          </div>

          {/* Coaching response — dark card */}
          <div className="rounded-lg border border-ink bg-ink p-5 text-chalk">
            <div className="mb-3">
              <ForemanBadge />
            </div>
            <div className="space-y-3">
              {coaching.split(/\n\s*\n/).map((p, i) => (
                <p
                  key={i}
                  className="type-body-lg text-[15.5px] leading-[1.6] text-chalk"
                >
                  {p}
                </p>
              ))}
            </div>
            {(phase || tags.length > 0) ? (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                {phase ? (
                  <Badge
                    variant={PHASE_BADGE[phase] ?? "outline"}
                    size="sm"
                  >
                    {phase}
                  </Badge>
                ) : null}
                {tags.map((t) => (
                  <Badge key={t} variant="inverse" size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <SaveToJournal coaching={coaching} promptText={promptText} />

          <p className="type-caption text-center text-graphite">
            Saved to{" "}
            <Link
              href="/app/library"
              className="text-ink2 underline underline-offset-2 hover:text-ink"
            >
              your library
            </Link>
            . Come back tomorrow.
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <div
            className={`rounded-lg border-[1.5px] bg-chalk transition-colors ${
              response ? "border-ink ring-[3px] ring-ruleSoft" : "border-rule border-dashed"
            }`}
          >
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={pending}
              rows={8}
              placeholder="The thing you can't stop turning over. The conversation you're dreading. The decision waiting on you.&#10;&#10;One to three paragraphs. Plain words."
              autoFocus
              className="min-h-[180px] border-0 bg-transparent text-[15px] focus:ring-0"
            />
            <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-2.5">
              <span className="type-caption text-graphite">
                {wordCount} word{wordCount === 1 ? "" : "s"} ·{" "}
                {paragraphs || 0} paragraph
                {paragraphs === 1 ? "" : "s"}
              </span>
              <Button size="sm" onClick={submit} disabled={pending}>
                {pending ? (
                  <>
                    <Spinner /> Reading…
                  </>
                ) : (
                  <>
                    Send <ArrowIcon size={14} />
                  </>
                )}
              </Button>
            </div>
          </div>

          {error ? (
            <p className="type-caption text-rust">{error}</p>
          ) : (
            <p className="type-caption inline-flex items-center gap-1.5 text-graphite">
              <svg
                width="13"
                height="13"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="10" cy="10" r="7" />
                <path d="M10 6v4l3 2" strokeLinecap="round" />
              </svg>
              Under 5 minutes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Keep the key point: saves the coaching into the journal as an `insight`,
// where the coach can draw on it later — knowledge carefully recorded is
// knowledge available in a time of need.
function SaveToJournal({
  coaching,
  promptText,
}: {
  coaching: string;
  promptText: string;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (saved) {
    return (
      <p className="type-caption text-center text-moss">
        Kept in your journal — your coach will remember this.
      </p>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await saveJournalEntry({
              body: coaching,
              prompt_text: promptText,
              kind: "insight",
              source: "Coach",
            });
            if (res.ok) setSaved(true);
            else setError(res.error);
          })
        }
        className="type-label inline-flex items-center gap-1.5 rounded-lg border border-rule bg-chalk px-4 py-2.5 text-ink2 transition-colors hover:border-blueprint hover:text-blueprint"
      >
        {pending ? <Spinner /> : null}
        Keep this in my journal
      </button>
      {error ? (
        <p className="type-caption mt-2 text-rust">{error}</p>
      ) : null}
    </div>
  );
}
