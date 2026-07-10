"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";

// Propose a 30-minute slot (weeks 3–7). The API validates the window and
// the one-active-booking rule server-side; never trust the client.
export function BookingForm({ minISO, maxISO }: { minISO: string; maxISO: string }) {
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!when) return;
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/cohort/office-hours/book", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scheduled_at_local: when, note: note.trim() || null }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not book the slot.");
          return;
        }
        router.refresh();
      } catch {
        setError("Network problem. Try again.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-rule bg-chalk p-5">
      <p className="type-cap text-graphite">PROPOSE A TIME</p>
      <p className="type-caption mt-1 text-graphite">
        Pick a time that works for you (your local time). Your mentor confirms
        by email, usually within a day.
      </p>
      <input
        type="datetime-local"
        value={when}
        min={minISO}
        max={maxISO}
        onChange={(e) => setWhen(e.target.value)}
        className="type-body mt-3 w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none focus:border-blueprint"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="What do you want to work on? (optional, helps the mentor prepare)"
        className="type-body mt-2 w-full resize-none rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none focus:border-blueprint"
      />
      {error ? <p className="type-caption mt-2 text-rust">{error}</p> : null}
      <div className="mt-3">
        <Button size="md" onClick={submit} disabled={pending || !when}>
          {pending ? (
            <>
              <Spinner /> Booking…
            </>
          ) : (
            "Request the slot"
          )}
        </Button>
      </div>
    </div>
  );
}
