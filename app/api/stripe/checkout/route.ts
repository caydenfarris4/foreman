import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceEnvFor } from "@/lib/stripe";
import type { Profile } from "@/lib/database.types";

export const runtime = "nodejs";

const BodySchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const priceId = priceEnvFor(parsed.data.plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";

  // Reuse the Stripe customer if we already have one. Otherwise let
  // Checkout create one and capture the id back in the webhook.
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
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
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/app?checkout=success`,
    cancel_url: `${appUrl}/app/upgrade?checkout=cancelled`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan: parsed.data.plan },
    subscription_data: {
      metadata: { user_id: user.id },
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
