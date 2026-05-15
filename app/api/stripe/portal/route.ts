import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type { Profile } from "@/lib/database.types";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
      303,
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Pick<Profile, "stripe_customer_id"> | null;
  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(
      new URL(
        "/app/upgrade?error=no_customer",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
      303,
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/app/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
