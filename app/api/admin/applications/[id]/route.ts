import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import { isUuid } from "@/lib/validation";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  cohortAcceptedHtml,
  cohortAcceptedSubject,
} from "@/lib/emails/cohort";
import { priceForUser, formatCohortPrice } from "@/lib/cohorts";
import type { Cohort, Profile } from "@/lib/database.types";

export const runtime = "nodejs";

const PatchSchema = z.object({
  decision: z.enum(["accept", "reject", "withdraw"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};
  if (parsed.data.decision === "accept") {
    update.status = "accepted";
    update.accepted_at = now;
  } else if (parsed.data.decision === "reject") {
    update.status = "rejected";
  } else if (parsed.data.decision === "withdraw") {
    update.status = "withdrew";
    update.withdrew_at = now;
  }

  const { data: updatedRow, error } = await admin
    .from("cohort_participants")
    .update(update)
    .eq("id", id)
    .select("user_id, cohort_id")
    .single();
  if (error || !updatedRow) {
    console.error("Admin application PATCH failed", error?.message);
    return NextResponse.json(
      { error: "Could not update application." },
      { status: 500 },
    );
  }

  // Acceptance email with the payment link (7-day window). Fire-and-forget:
  // the decision stands even if the mail hiccups — it's visible in-app too.
  if (parsed.data.decision === "accept") {
    try {
      const { user_id, cohort_id } = updatedRow as {
        user_id: string;
        cohort_id: string;
      };
      const [{ data: profRow }, { data: cohortRow }] = await Promise.all([
        admin
          .from("profiles")
          .select("name, email, subscription_status")
          .eq("id", user_id)
          .maybeSingle(),
        admin
          .from("cohorts")
          .select("name, slug, price_cents, subscriber_discount_cents")
          .eq("id", cohort_id)
          .maybeSingle(),
      ]);
      const prof = profRow as Pick<
        Profile,
        "name" | "email" | "subscription_status"
      > | null;
      const cohort = cohortRow as Pick<
        Cohort,
        "name" | "slug" | "price_cents" | "subscriber_discount_cents"
      > | null;
      if (prof?.email && cohort) {
        const price = priceForUser(cohort, prof);
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.coach";
        const resend = getResend();
        await resend.emails.send({
          from: getFromAddress(),
          to: prof.email,
          subject: cohortAcceptedSubject(cohort.name),
          html: cohortAcceptedHtml({
            name: prof.name,
            cohortName: cohort.name,
            payUrl: `${appUrl}/cohorts/${cohort.slug}/apply`,
            priceLabel: formatCohortPrice(price.cents),
          }),
        });
      }
    } catch (err) {
      console.error("Cohort acceptance email failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
