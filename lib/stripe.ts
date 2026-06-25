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

// Last-resort display fallback ONLY for when the Stripe price lookup fails
// (e.g. Stripe unreachable). The live pages call getPriceDisplay() below so the
// number shown always matches the Stripe Price that is actually charged.
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

export interface PriceDisplay {
  /** Amount in major units (e.g. 19 for $19.00, 19.5 for $19.50). */
  amount: number;
  /** ISO currency code, lower-case as Stripe returns it (e.g. "usd"). */
  currency: string;
  /** Billing interval from the Stripe Price (e.g. "month", "year"). */
  interval: string;
  /** Formatted price, e.g. "$19" or "$19.50". */
  display: string;
  /** Human suffix, e.g. "/month" or "/year". */
  suffix: string;
}

function suffixForInterval(interval: string): string {
  if (interval === "month") return "/month";
  if (interval === "year") return "/year";
  if (interval === "week") return "/week";
  if (interval === "day") return "/day";
  return `/${interval}`;
}

function formatPrice(price: Stripe.Price): PriceDisplay | null {
  // Only recurring prices make sense for a subscription.
  if (price.unit_amount == null || !price.recurring) return null;
  const amount = price.unit_amount / 100;
  const currency = price.currency;
  const display = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
  return {
    amount,
    currency,
    interval: price.recurring.interval,
    display,
    suffix: suffixForInterval(price.recurring.interval),
  };
}

// Tiny per-process cache. These pages are low-traffic and authed, but there is
// no reason to hit Stripe on every render; prices change rarely.
const priceCache = new Map<string, { value: PriceDisplay; at: number }>();
const PRICE_TTL_MS = 5 * 60_000;

/**
 * Fetch the live display price for a plan straight from Stripe, by the Price ID
 * in the environment. Returns null when the price is not configured or Stripe
 * cannot be reached, so callers fall back to the static PRICING constants.
 */
export async function getPriceDisplay(
  id: PricingId,
): Promise<PriceDisplay | null> {
  const priceId = priceEnvFor(id);
  if (!priceId) return null;

  const cached = priceCache.get(priceId);
  if (cached && Date.now() - cached.at < PRICE_TTL_MS) return cached.value;

  try {
    const price = await getStripe().prices.retrieve(priceId);
    const formatted = formatPrice(price);
    if (formatted) priceCache.set(priceId, { value: formatted, at: Date.now() });
    return formatted;
  } catch (err) {
    console.error(
      `Could not fetch Stripe price for ${id}:`,
      err instanceof Error ? err.message : "unknown error",
    );
    return null;
  }
}

/** Format the yearly savings vs paying monthly for a year, e.g. "Save $59". */
export function yearlySavingsLabel(
  monthly: PriceDisplay | null,
  yearly: PriceDisplay | null,
): string | undefined {
  if (!monthly || !yearly) return undefined;
  if (monthly.currency !== yearly.currency) return undefined;
  const saved = monthly.amount * 12 - yearly.amount;
  if (saved <= 0) return undefined;
  const label = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: yearly.currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(saved) ? 0 : 2,
  }).format(saved);
  return `Save ${label}`;
}

export function isActiveSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "churned" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "churned";
}
