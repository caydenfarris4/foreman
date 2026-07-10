"use client";

// The reflection composer. Opens from the prompt card (seeded with today's
// prompt) or the floating "+" (blank). Saves through saveJournalEntry;
// deeper journal functionality is coming later — this is the working base.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveJournalEntry, deleteJournalEntry } from "./actions";

export function JournalComposer({ promptText }: { promptText: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "prompted" | "blank">("closed");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = mode !== "closed";

  function save() {
    const text = body.trim();
    if (text.length < 3) return;
    setError(null);
    start(async () => {
      const res = await saveJournalEntry({
        body: text,
        prompt_text: mode === "prompted" ? promptText : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setMode("closed");
      router.refresh();
    });
  }

  return (
    <>
      {/* Today's prompt — the Cornerstone ink card. */}
      <div className="surface-ink rounded-xl p-5">
        <p className="type-cap text-oak">TODAY&apos;S PROMPT</p>
        <p className="type-prompt mt-2 text-[oklch(0.95_0.01_80)]">
          {promptText}
        </p>
        {!open ? (
          <button
            type="button"
            onClick={() => setMode("prompted")}
            className="type-label mt-4 inline-flex items-center gap-1 rounded-lg bg-blueprint px-4 py-2.5 text-[oklch(0.98_0.01_80)] transition-colors hover:bg-blueprint-dim"
          >
            Write a reflection ›
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-rule bg-chalk p-4">
              {mode === "blank" ? (
                <p className="type-cap mb-2 text-graphite">NEW ENTRY</p>
              ) : null}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                autoFocus
                placeholder={
                  mode === "prompted"
                    ? "Write it plainly — no one is grading this…"
                    : "What's on your mind?"
                }
              />
              {error ? (
                <p className="type-caption mt-2 text-rust">{error}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="md"
                  onClick={save}
                  disabled={pending || body.trim().length < 3}
                >
                  {pending ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    "Save entry"
                  )}
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => {
                    setMode("closed");
                    setBody("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating + — a blank entry, no prompt. */}
      {!open ? (
        <button
          type="button"
          aria-label="New journal entry"
          onClick={() => setMode("blank")}
          className="fixed bottom-28 right-5 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-blueprint p-3.5 text-[oklch(0.98_0.01_80)] shadow-liftStrong transition-colors hover:bg-blueprint-dim"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4v14M4 11h14" />
          </svg>
        </button>
      ) : null}
    </>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Delete entry"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteJournalEntry({ id });
          if (res.ok) router.refresh();
        })
      }
      className="type-cap text-graphite transition-colors hover:text-rust"
    >
      ✕
    </button>
  );
}
