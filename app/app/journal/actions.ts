"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/utils";
import type { Profile } from "@/lib/database.types";

type Result = { ok: true } | { ok: false; error: string };

const EntrySchema = z.object({
  body: z.string().trim().min(3).max(8000),
  prompt_text: z.string().trim().max(500).nullable().optional(),
  tag: z.string().trim().max(40).nullable().optional(),
  // reflection = free writing; quote = kept from reading (source = book/
  // author); insight = a key point saved from a coaching response.
  kind: z.enum(["reflection", "quote", "insight"]).optional(),
  source: z.string().trim().max(120).nullable().optional(),
});

export async function saveJournalEntry(input: unknown): Promise<Result> {
  const parsed = EntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Write a few words first." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const timezone =
    (profileRow as Pick<Profile, "timezone"> | null)?.timezone ??
    "America/Denver";

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    entry_date: todayInTimezone(timezone),
    body: parsed.data.body,
    prompt_text: parsed.data.prompt_text ?? null,
    tag: parsed.data.tag ?? null,
    kind: parsed.data.kind ?? "reflection",
    source: parsed.data.source ?? null,
  });
  if (error) return { ok: false, error: "Could not save it. Try again." };

  revalidatePath("/app/journal");
  return { ok: true };
}

export async function deleteJournalEntry(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not delete the entry." };

  revalidatePath("/app/journal");
  return { ok: true };
}
