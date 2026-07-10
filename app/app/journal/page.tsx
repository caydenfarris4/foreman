import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reflectionForDay } from "@/lib/prompts/reflection";
import { todayInTimezone } from "@/lib/utils";
import type { JournalEntry, Profile } from "@/lib/database.types";
import { JournalComposer, DeleteEntryButton } from "./composer";

// Journal — the Cornerstone reflection surface. Today's prompt (book-grounded,
// rotated daily) + recent entries. Persistence is intentionally minimal for
// now; richer journal functionality lands later on this base.
export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const timezone =
    (profileRow as Pick<Profile, "timezone"> | null)?.timezone ??
    "America/Denver";
  const today = todayInTimezone(timezone);
  const prompt = reflectionForDay(today, user.id);

  const { data: entriesData } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  const entries = (entriesData ?? []) as JournalEntry[];

  return (
    <div className="space-y-6 px-3 pb-8 pt-6">
      <header className="px-1">
        <h1 className="type-h1 text-ink">Journal</h1>
      </header>

      <JournalComposer promptText={prompt} />

      <section>
        <p className="type-cap px-1 text-graphite">RECENT ENTRIES</p>
        {entries.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-ruleStrong bg-chalk/60 p-5 text-center">
            <p className="type-body-sm text-graphite">
              Nothing here yet. Your first reflection becomes the cornerstone —
              start with today&apos;s prompt above.
            </p>
          </div>
        ) : (
          <div className="mt-2 divide-y divide-ruleSoft rounded-lg border border-rule bg-chalk">
            {entries.map((e) => (
              <details key={e.id} className="group px-4 py-3.5">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="type-label text-ink">
                      {dayLabel(e.entry_date)}
                    </span>
                    <span className="flex items-center gap-3">
                      {e.tag ? (
                        <span className="type-cap text-graphite">{e.tag}</span>
                      ) : null}
                      <DeleteEntryButton id={e.id} />
                    </span>
                  </div>
                  <p className="type-body-sm mt-1 line-clamp-2 text-ink2 group-open:hidden">
                    {e.body}
                  </p>
                </summary>
                {e.prompt_text ? (
                  <p className="type-caption mt-2 italic text-graphite">
                    {e.prompt_text}
                  </p>
                ) : null}
                <p className="type-body-sm mt-2 whitespace-pre-wrap text-ink2">
                  {e.body}
                </p>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function dayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  const now = new Date();
  const days = Math.round(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) /
      86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)
    return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
