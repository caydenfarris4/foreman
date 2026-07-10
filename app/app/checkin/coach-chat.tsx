"use client";

// The Coach tab: a contained conversation with the coach — the author's
// voice, grounded in Under Construction. The transcript lives in client
// state (contained by design); keeping a reply saves it to the journal as
// an insight, which the coach then draws on everywhere.
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveJournalEntry } from "../journal/actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function CoachChat({ firstName }: { firstName: string | null }) {
  const greeting = firstName
    ? `Good to see you, ${firstName}. What are you carrying today?`
    : "Good to see you. What are you carrying today?";
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    setDraft("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Skip the client-side greeting; the API needs user-led turns.
        body: JSON.stringify({ messages: next.slice(1).slice(-12) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something broke. Try again.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
    } catch {
      setError("Network problem — your message is still below. Try again.");
      setDraft(text);
      setMessages(messages);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3",
                  m.role === "user"
                    ? "surface-ink rounded-br-sm"
                    : "rounded-bl-sm border border-rule bg-chalk",
                )}
              >
                <p
                  className={cn(
                    "type-body whitespace-pre-wrap",
                    m.role === "user"
                      ? "text-[oklch(0.96_0.01_80)]"
                      : "text-ink2",
                  )}
                >
                  {m.content}
                </p>
                {m.role === "assistant" && i > 0 ? (
                  <KeepInJournal content={m.content} />
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pending ? (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm border border-rule bg-chalk px-4 py-3">
              <span className="type-caption inline-flex items-center gap-2 text-graphite">
                <Spinner size={12} /> thinking…
              </span>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="type-caption text-center text-rust">{error}</p>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-24 mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Message your coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="type-body max-h-32 min-h-[48px] flex-1 resize-none rounded-[24px] border border-rule bg-chalk px-4 py-3 text-ink shadow-lift outline-none focus:border-blueprint"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={send}
          disabled={pending || !draft.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-[oklch(0.97_0.01_80)] transition-colors hover:bg-[oklch(0.26_0.02_55)] disabled:bg-shell disabled:text-haze"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function KeepInJournal({ content }: { content: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  if (saved) {
    return (
      <p className="type-caption mt-2 border-t border-ruleSoft pt-2 text-moss">
        Kept in your journal.
      </p>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await saveJournalEntry({
            body: content,
            kind: "insight",
            source: "Coach",
          });
          if (res.ok) setSaved(true);
        })
      }
      className="type-caption mt-2 border-t border-ruleSoft pt-2 text-graphite transition-colors hover:text-blueprint"
    >
      {pending ? "Keeping…" : "+ Keep this in my journal"}
    </button>
  );
}
