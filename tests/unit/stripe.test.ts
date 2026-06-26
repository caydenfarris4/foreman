import { afterEach, describe, expect, it, vi } from "vitest";
import { isActiveSubscriptionStatus, priceEnvFor } from "@/lib/stripe";

describe("isActiveSubscriptionStatus", () => {
  it("maps Stripe statuses to our three buckets", () => {
    expect(isActiveSubscriptionStatus("active")).toBe("active");
    expect(isActiveSubscriptionStatus("trialing")).toBe("active");
    expect(isActiveSubscriptionStatus("past_due")).toBe("past_due");
    expect(isActiveSubscriptionStatus("unpaid")).toBe("past_due");
    expect(isActiveSubscriptionStatus("canceled")).toBe("churned");
    expect(isActiveSubscriptionStatus("incomplete_expired")).toBe("churned");
  });
});

describe("priceEnvFor", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("reads the right env var per plan", () => {
    vi.stubEnv("STRIPE_PRICE_MONTHLY", "price_m");
    vi.stubEnv("STRIPE_PRICE_YEARLY", "price_y");
    expect(priceEnvFor("monthly")).toBe("price_m");
    expect(priceEnvFor("yearly")).toBe("price_y");
  });
  it("returns undefined when unset (caller must handle)", () => {
    vi.stubEnv("STRIPE_PRICE_MONTHLY", "");
    // empty string is falsy-but-defined; ensure missing var is undefined
    vi.unstubAllEnvs();
    expect(priceEnvFor("monthly")).toBeUndefined();
  });
});
