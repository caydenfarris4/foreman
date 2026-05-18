"use client";

import { useState, useTransition } from "react";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm({ cohortSlug }: { cohortSlug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit() {
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cohorts/${cohortSlug}/waitlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Try again.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mt-8 rounded-lg border border-rule bg-chalk p-6">
        <p className="type-h2 text-ink">You&apos;re on the list.</p>
        <p className="type-body mt-2 text-ink2">
          We&apos;ll email you the moment applications open for the next
          cohort.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded-lg border border-rule bg-chalk p-5">
      <div>
        <label className="type-label text-ink2">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div>
        <label className="type-label text-ink2">Name (optional)</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={120}
        />
      </div>
      {error ? (
        <p className="type-caption text-rust">{error}</p>
      ) : null}
      <div>
        <Button onClick={submit} disabled={pending || !email}>
          {pending ? (
            <>
              <Spinner /> Saving
            </>
          ) : (
            "Add me to the waitlist"
          )}
        </Button>
      </div>
    </div>
  );
}
