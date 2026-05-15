"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  checkinDate: string;
  promptText: string;
  existingResponse: string | null;
  existingCoaching: string | null;
}

export function CheckinForm({
  checkinDate,
  promptText,
  existingResponse,
  existingCoaching,
}: Props) {
  const router = useRouter();
  const [response, setResponse] = useState(existingResponse ?? "");
  const [coaching, setCoaching] = useState(existingCoaching);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const trimmed = response.trim();
    if (trimmed.length < 20) {
      setError("Give the foreman more than a sentence to work with — at least 20 characters.");
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
        router.refresh();
      } catch {
        setError("Network problem. Your response is still in this field — try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>Today's question</CardDescription>
          <CardTitle className="font-serif text-2xl leading-relaxed">
            {promptText}
          </CardTitle>
        </CardHeader>
      </Card>

      {coaching ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">The coaching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {coaching.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="leading-relaxed text-foreground">
                {para}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            {coaching ? "Your response" : "Write your response"}
          </CardTitle>
          <CardDescription>
            One to three paragraphs. Specific beats clever.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            disabled={pending || !!coaching}
            rows={10}
            placeholder="Be honest. The coaching is only as good as what you bring it."
            autoFocus={!coaching}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!coaching ? (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Reading…" : "Get coaching"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Saved. Come back tomorrow.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
