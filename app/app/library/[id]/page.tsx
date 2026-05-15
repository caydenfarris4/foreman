import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Situation } from "@/lib/database.types";

export default async function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("situations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const situation = data as Situation | null;
  if (!situation) notFound();

  // Pull the prompt from the originating check-in (if any).
  let promptText: string | null = null;
  if (situation.source_checkin_id) {
    const { data: checkin } = await supabase
      .from("daily_checkins")
      .select("prompt_text")
      .eq("id", situation.source_checkin_id)
      .maybeSingle();
    promptText = (checkin as { prompt_text: string } | null)?.prompt_text ?? null;
  }

  // Related situations — same phase, or sharing a tag, excluding this one.
  let related: Pick<Situation, "id" | "title" | "framework_phase" | "created_at">[] = [];
  if (situation.tags && situation.tags.length > 0) {
    const { data: relatedRows } = await supabase
      .from("situations")
      .select("id, title, framework_phase, created_at")
      .eq("user_id", user.id)
      .neq("id", situation.id)
      .overlaps("tags", situation.tags)
      .order("created_at", { ascending: false })
      .limit(5);
    related = (relatedRows ?? []) as typeof related;
  }
  if (related.length === 0 && situation.framework_phase) {
    const { data: phaseRows } = await supabase
      .from("situations")
      .select("id, title, framework_phase, created_at")
      .eq("user_id", user.id)
      .neq("id", situation.id)
      .eq("framework_phase", situation.framework_phase)
      .order("created_at", { ascending: false })
      .limit(5);
    related = (phaseRows ?? []) as typeof related;
  }

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <Link
        href="/app/library"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to library
      </Link>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {situation.framework_phase ? (
            <Link
              href={`/app/library?phase=${situation.framework_phase}`}
              className="hover:underline"
            >
              {situation.framework_phase}
            </Link>
          ) : (
            "—"
          )}{" "}
          ·{" "}
          {new Date(situation.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">
          {situation.title}
        </h1>
      </div>

      {promptText ? (
        <Card>
          <CardHeader>
            <CardDescription>The prompt that day</CardDescription>
            <CardTitle className="font-serif text-lg leading-relaxed">
              {promptText}
            </CardTitle>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">The situation</CardTitle>
          <CardDescription>What you wrote.</CardDescription>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap leading-relaxed">
          {situation.situation}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">The coaching</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {situation.coaching.split(/\n\s*\n/).map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </CardContent>
      </Card>

      {situation.tags && situation.tags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {situation.tags.map((t) => (
              <Link
                key={t}
                href={`/app/library?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-input bg-secondary px-2 py-0.5 text-xs text-secondary-foreground transition-colors hover:bg-secondary/70"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Related situations
          </p>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/app/library/${r.id}`}
                className="block rounded-md border bg-card p-3 transition-colors hover:bg-secondary/40"
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.framework_phase ?? "—"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="font-serif text-base leading-snug">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
