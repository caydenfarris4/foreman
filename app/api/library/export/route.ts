import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { Situation, SituationNote } from "@/lib/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data portability — a user can pull every situation + note they've ever
// saved. Available to any signed-in user regardless of subscription
// state, since it's *their* data.
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "library-export");
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "md" ? "md" : "json";

  const { data: situations } = await supabase
    .from("situations")
    .select("id, title, situation, coaching, framework_phase, tags, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5000);

  const { data: notes } = await supabase
    .from("situation_notes")
    .select("id, situation_id, body, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20_000);

  const rows = (situations ?? []) as Pick<
    Situation,
    | "id"
    | "title"
    | "situation"
    | "coaching"
    | "framework_phase"
    | "tags"
    | "created_at"
  >[];
  const noteRows = (notes ?? []) as Pick<
    SituationNote,
    "id" | "situation_id" | "body" | "created_at"
  >[];

  const notesBySituation = new Map<string, typeof noteRows>();
  for (const n of noteRows) {
    const arr = notesBySituation.get(n.situation_id) ?? [];
    arr.push(n);
    notesBySituation.set(n.situation_id, arr);
  }

  const filename = `foreman-library-${new Date()
    .toISOString()
    .slice(0, 10)}.${format}`;

  if (format === "md") {
    const md = rows
      .map((s) => {
        const date = s.created_at.slice(0, 10);
        const phase = s.framework_phase ?? "—";
        const tags = (s.tags ?? []).join(", ") || "—";
        const notes = (notesBySituation.get(s.id) ?? [])
          .map(
            (n) =>
              `\n> *${n.created_at.slice(0, 10)}* — ${n.body.replace(/\n/g, " ")}`,
          )
          .join("\n");
        return [
          `## ${s.title}`,
          ``,
          `- **Filed:** ${date}`,
          `- **Phase:** ${phase}`,
          `- **Tags:** ${tags}`,
          ``,
          `### Situation`,
          ``,
          s.situation,
          ``,
          `### Foreman's coaching`,
          ``,
          s.coaching,
          notes ? `\n### Notes${notes}` : ``,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    return new NextResponse(`# Foreman library\n\n${md}\n`, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    count: rows.length,
    situations: rows.map((s) => ({
      ...s,
      notes: notesBySituation.get(s.id) ?? [],
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
