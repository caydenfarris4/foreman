import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  situation: z.string().trim().min(1).max(8000).optional(),
  // Tag values are short; cap each, cap array size.
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, "library-edit");
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // RLS enforces user_id match; .eq("user_id", user.id) is belt-and-braces.
  const { error } = await supabase
    .from("situations")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Library PATCH failed", error.message);
    return NextResponse.json(
      { error: "Could not save changes" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, "library-delete");
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
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
    .from("situations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Library DELETE failed", error.message);
    return NextResponse.json(
      { error: "Could not delete" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
