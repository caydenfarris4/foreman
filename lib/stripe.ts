import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    client = new Stripe(apiKey, { apiVersion: "2026-04-22.dahlia" });
  }
  return client;
}

export const PRICING = {
  monthly: { display: "$19", suffix: "/month", id: "monthly" as const },
  yearly: {
    display: "$169",
    suffix: "/year",
    id: "yearly" as const,
    savings: "Save $59",
  },
};

export type PricingId = "monthly" | "yearly";

export function priceEnvFor(id: PricingId): string | undefined {
  return id === "monthly"
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_YEARLY;
}

export function isActiveSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "churned" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "churned";
}
