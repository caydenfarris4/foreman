import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Situation } from "@/lib/database.types";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("situations")
    .select("id, title, framework_phase, tags, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const situations = (data ?? []) as Pick<
    Situation,
    "id" | "title" | "framework_phase" | "tags" | "created_at"
  >[];

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Situation library</h1>
        <p className="mt-1 text-muted-foreground">
          Every check-in lives here. Pull it up when the same situation comes back.
        </p>
      </div>

      {situations.length > 0 ? (
        <div className="space-y-3">
          {situations.map((s) => (
            <Link key={s.id} href={`/app/library/${s.id}`}>
              <Card className="transition-colors hover:bg-secondary/40">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <span className="uppercase tracking-widest">
                      {s.framework_phase ?? "—"}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </CardDescription>
                  <CardTitle className="font-serif text-lg leading-snug">
                    {s.title}
                  </CardTitle>
                </CardHeader>
                {s.tags && s.tags.length > 0 ? (
                  <CardContent className="flex flex-wrap gap-2 pt-0">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Nothing here yet.</CardTitle>
            <CardDescription>
              Finish a check-in and it'll show up here automatically — title, tags,
              coaching, all of it.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
