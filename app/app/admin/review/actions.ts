"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

// Verify the caller is an admin (Cayden). Authorization lives in app code
// because the review tables are service-role only (no client RLS policy).
async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(data as { is_admin: boolean } | null)?.is_admin) {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true, userId: user.id };
}

const ApproveSchema = z.object({
  inspection_id: z.string().uuid(),
  edited_report: z.string().trim().max(8000).optional(),
  cayden_note: z.string().trim().max(4000).optional(),
});

// Approve a routed inspection (optionally with an edited draft and/or a
// personal note) and send it to the user. The user-facing report carries the
// note seamlessly; the human layer may cross the faith bridge (governance §3).
export async function approveInspection(input: unknown): Promise<Result> {
  const parsed = ApproveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const note = parsed.data.cayden_note?.trim() || null;
  const edited = parsed.data.edited_report?.trim() || null;

  const update: Record<string, unknown> = {
    status: "sent",
    flag_status: "cleared",
    sent_at: nowIso,
    reviewed_by: auth.userId,
  };
  if (edited) update.generated_report = edited;
  if (note) update.cayden_note = note;

  const { error } = await admin
    .from("inspections")
    .update(update)
    .eq("id", parsed.data.inspection_id);
  if (error) return { ok: false, error: "Could not send the report." };

  await admin
    .from("review_queue_items")
    .update({
      status: note ? "noted" : "approved",
      resolved_by: auth.userId,
      resolved_at: nowIso,
    })
    .eq("inspection_id", parsed.data.inspection_id);

  revalidatePath("/app/admin/review");
  return { ok: true };
}
