"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WeekCheckin {
  checkin_date: string;
  prompt_text: string;
  framework_phase: string | null;
}

interface Props {
  weekStart: string;
  weekEnd: string;
  isRetroDay: boolean;
  retroDay: string;
  existingWins: string;
  existingStruggles: string;
  existingLessons: string;
  existingSynthesis: string | null;
  existingFocus: string | null;
  weekCheckins: WeekCheckin[];
}

const WEEKDAY_LABEL: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

function formatRange(startISO: string, endISO: string): string {
  const start = new Date(`${startISO}T12:00:00Z`);
  const end = new Date(`${endISO}T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString(
    "en-US",
    opts,
  )}`;
}

export function RetroForm({
  weekStart,
  weekEnd,
  isRetroDay,
  retroDay,
  existingWins,
  existingStruggles,
  existingLessons,
  existingSynthesis,
  existingFocus,
  weekCheckins,
}: Props) {
  const router = useRouter();
  const [wins, setWins] = useState(existingWins);
  const [struggles, setStruggles] = useState(existingStruggles);
  const [lessons, setLessons] = useState(existingLessons);
  const [synthesis, setSynthesis] = useState(existingSynthesis);
  const [focus, setFocus] = useState(existingFocus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isLocked = !!synthesis;

  async function submit() {
    setError(null);
    const total = wins.trim().length + struggles.trim().length + lessons.trim().length;
    if (total < 20) {
      setError("Write at least a sentence or two across the three fields.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/retro/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            week_start: weekStart,
            wins: wins.trim(),
            struggles: struggles.trim(),
            lessons: lessons.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Something broke on our end.");
          return;
        }
        setSynthesis(json.synthesis);
        setFocus(json.framework_focus);
        router.refresh();
      } catch {
        setError("Network problem. Your fields are still here — try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Week of {formatRange(weekStart, weekEnd)}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">
          Weekly retrospective
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRetroDay
            ? "Today's your retro day. Twenty minutes. Three fields. One synthesis back."
            : `Your retro day is ${WEEKDAY_LABEL[retroDay] ?? retroDay}, but you can write or revise any time before the week is done.`}
        </p>
      </div>

      {weekCheckins.length > 0 ? (
        <Card>
          <CardHeader>
            <CardDescription>What you checked in on this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekCheckins.map((c) => (
              <div
                key={c.checkin_date}
                className="flex items-baseline gap-3 text-sm"
              >
                <span className="w-16 shrink-0 text-xs uppercase tracking-widest text-muted-foreground">
                  {new Date(`${c.checkin_date}T12:00:00Z`).toLocaleDateString(
                    "en-US",
                    { weekday: "short", timeZone: "UTC" },
                  )}
                </span>
                <span className="text-foreground/90">{c.prompt_text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {synthesis ? (
        <Card>
          <CardHeader>
            <CardDescription>
              {focus ? `Framework focus: ${focus}` : "Synthesis"}
            </CardDescription>
            <CardTitle className="font-serif text-xl">
              The pattern this week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {synthesis.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="leading-relaxed">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            {synthesis ? "What you wrote" : "Your retrospective"}
          </CardTitle>
          <CardDescription>
            Be specific. The synthesis is only as good as what you bring it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wins">Wins</Label>
            <Textarea
              id="wins"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              disabled={pending || isLocked}
              rows={4}
              placeholder="What worked. Even the small ones."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="struggles">Struggles</Label>
            <Textarea
              id="struggles"
              value={struggles}
              onChange={(e) => setStruggles(e.target.value)}
              disabled={pending || isLocked}
              rows={4}
              placeholder="What was hard. What you avoided. What you reacted to."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lessons">Lessons</Label>
            <Textarea
              id="lessons"
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              disabled={pending || isLocked}
              rows={4}
              placeholder="What you'd carry into next week — even if it's one line."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!isLocked ? (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Synthesizing…" : "Get the synthesis"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Saved. See you next week.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
