import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ noteId: string }> },
) {
  const limited = await enforceRateLimit(request, "library-notes-delete");
  if (limited) return limited;

  const { noteId } = await ctx.params;
  if (!isUuid(noteId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase
    .from("situation_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete note failed", error.message);
    return NextResponse.json(
      { error: "Could not delete" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
