"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

type Result = { ok: true } | { ok: false; error: string };

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// Mirrors the profiles check constraints (0001, 0002) and the onboarding
// schema; RLS restricts the update to the caller's own row.
const SettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  role_title: z.string().trim().max(120),
  current_challenge: z.string().trim().max(300),
  sabbath_day: z.enum([...WEEKDAYS, "none"]),
  retro_day: z.enum(WEEKDAYS),
  notification_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  timezone: z.string().trim().min(1).max(64),
});

export async function updateSettings(input: unknown): Promise<Result> {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Check every field and try again.",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      name: d.name,
      role_title: d.role_title || null,
      current_challenge: d.current_challenge || null,
      sabbath_day: d.sabbath_day,
      retro_day: d.retro_day,
      notification_time: d.notification_time + ":00",
      timezone: d.timezone,
    })
    .eq("id", user.id);
  if (error) {
    console.error("Settings save failed", error.message);
    return { ok: false, error: "Could not save. Try again." };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true };
}

// The literal phrase the user must type. Validated server-side so the
// confirmation can't be bypassed by calling the action directly.
const DeleteAccountSchema = z.object({ confirm: z.literal("DELETE") });

// Permanently deletes the caller's account: Stripe customer first (so a
// live subscription can never outlive the account), then the email-keyed
// rows that don't cascade, then the auth user — which cascades through
// profiles into every user-owned table (0001 onward all use
// `on delete cascade`). Required for Google Play / App Store account
// deletion policies; the public how-to lives at /delete-account.
export async function deleteAccount(input: unknown): Promise<Result> {
  const parsed = DeleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const stripeCustomerId =
    (data as { stripe_customer_id: string | null } | null)
      ?.stripe_customer_id ?? null;

  // Cancel billing before touching any data. Deleting the Stripe customer
  // immediately cancels all subscriptions and detaches payment methods; if
  // this fails we abort with nothing deleted rather than risk charging a
  // user whose account is gone.
  if (stripeCustomerId) {
    try {
      await getStripe().customers.del(stripeCustomerId);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "resource_missing") {
        console.error("Account deletion: Stripe cancel failed", err);
        return {
          ok: false,
          error:
            "We couldn't cancel your subscription, so nothing was deleted. Try again in a minute.",
        };
      }
    }
  }

  const admin = createAdminClient();

  // Email-keyed rows have no FK to the profile, so the cascade below
  // misses them. Best effort — a leftover marketing-waitlist row must not
  // strand the user in a half-deleted account.
  if (user.email) {
    for (const table of ["waitlist_signups", "cohort_waitlist"] as const) {
      const { error } = await admin
        .from(table)
        .delete()
        .ilike("email", user.email);
      if (error) {
        console.error(`Account deletion: ${table} cleanup failed`, error.message);
      }
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Account deletion failed", deleteError.message);
    return {
      ok: false,
      error: "Deletion failed. Try again, or email support if it keeps happening.",
    };
  }

  // Clear this browser's session cookies. The user no longer exists, so
  // a failure here is cosmetic — the stale cookie can't authenticate.
  await supabase.auth.signOut().catch(() => {});
  return { ok: true };
}
