import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/rate-limit";

import { isValidSlug, stripePriceIdForUser } from "@/lib/cohorts";
import type {
  Cohort,
  CohortParticipant,
  Profile,
} from "@/lib/database.types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const limited = await enforceRateLimit(request, "cohort-checkout");
  if (limited) return limited;

  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Cohort + applicant must both exist and the applicant must be accepted.
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select(
      "id, name, slug, status, stripe_price_id_standard, stripe_price_id_subscriber",
    )
    .eq("slug", slug)
    .maybeSingle();
  const cohort = cohortRow as Pick<
    Cohort,
    | "id"
    | "name"
    | "slug"
    | "status"
    | "stripe_price_id_standard"
    | "stripe_price_id_subscriber"
  > | null;
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  if (!["open", "full"].includes(cohort.status)) {
    return NextResponse.json(
      { error: "This cohort is no longer accepting payments." },
      { status: 409 },
    );
  }

  const { data: participantRow } = await supabase
    .from("cohort_participants")
    .select("id, status")
    .eq("cohort_id", cohort.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const participant = participantRow as Pick<
    CohortParticipant,
    "id" | "status"
  > | null;
  if (!participant) {
    return NextResponse.json(
      { error: "Apply to the cohort first." },
      { status: 403 },
    );
  }
  if (participant.status !== "accepted") {
    return NextResponse.json(
      { error: "Your application isn't ready for checkout yet." },
      { status: 409 },
    );
  }

  // Pick the right price id for the user (subscriber vs standard).
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_customer_id, email, name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Pick<
    Profile,
    "subscription_status" | "stripe_customer_id" | "email" | "name"
  > | null;

  const priceId = stripePriceIdForUser(cohort, profile);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Stripe price not configured for this cohort yet. Email Cayden.",
      },
      { status: 500 },
    );
  }

  // Reuse the existing Stripe customer if we have one; otherwise let
  // Checkout create one and let the webhook capture the id.
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId && profile?.email) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/app?checkout=cohort_success`,
    cancel_url: `${appUrl}/cohorts/${cohort.slug}/apply?checkout=cancelled`,
    payment_intent_data: {
      metadata: {
        type: "cohort",
        cohort_id: cohort.id,
        participant_id: participant.id,
        user_id: user.id,
      },
    },
    metadata: {
      type: "cohort",
      cohort_id: cohort.id,
      participant_id: participant.id,
      user_id: user.id,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a session URL" },
      { status: 502 },
    );
  }
  return NextResponse.json({ url: session.url });
}
