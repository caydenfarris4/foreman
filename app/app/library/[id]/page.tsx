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
          {situation.framework_phase ?? "—"} ·{" "}
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

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">The situation</CardTitle>
          <CardDescription>What you wrote.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 whitespace-pre-wrap leading-relaxed">
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
        <div className="flex flex-wrap gap-2">
          {situation.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
