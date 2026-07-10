import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { Profile } from "@/lib/database.types";

export const runtime = "nodejs";

// Stripe checkout for a paid 1:1 coaching session (after the free first
// one). One-time payment; the webhook (metadata.type === 'coaching') grants
// the credit. Price comes from the STRIPE_PRICE_COACHING runtime secret.
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "coaching-checkout");
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_COACHING;
  if (!priceId) {
    return NextResponse.json(
      { error: "Session booking isn't configured yet. Email Cayden." },
      { status: 500 },
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("email, name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Pick<
    Profile,
    "email" | "name" | "stripe_customer_id"
  > | null;

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.coach";

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
    success_url: `${appUrl}/app/checkin?coaching=success`,
    cancel_url: `${appUrl}/app/checkin?coaching=cancelled`,
    payment_intent_data: {
      metadata: { type: "coaching", user_id: user.id },
    },
    metadata: { type: "coaching", user_id: user.id },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not start checkout. Try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ url: session.url });
}
