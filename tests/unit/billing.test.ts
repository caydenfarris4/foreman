import { describe, expect, it } from "vitest";
import { accessFor, canUseAi, isPaywalled } from "@/lib/billing";

const NOW = new Date("2026-06-25T12:00:00Z");

function profile(
  status: "trial" | "active" | "past_due" | "churned",
  trialEnds: string,
) {
  return { subscription_status: status, trial_ends_at: trialEnds };
}

describe("accessFor", () => {
  it("active subscription is active regardless of trial date", () => {
    expect(accessFor(profile("active", "2000-01-01T00:00:00Z"), NOW)).toEqual({
      state: "active",
    });
  });

  it("past_due maps to past_due", () => {
    expect(accessFor(profile("past_due", "2999-01-01T00:00:00Z"), NOW)).toEqual({
      state: "past_due",
    });
  });

  it("churned maps to churned", () => {
    expect(accessFor(profile("churned", "2999-01-01T00:00:00Z"), NOW)).toEqual({
      state: "churned",
    });
  });

  it("trial in the future is trialing with day count", () => {
    const res = accessFor(profile("trial", "2026-06-30T12:00:00Z"), NOW);
    expect(res.state).toBe("trialing");
    if (res.state === "trialing") expect(res.daysLeft).toBe(5);
  });

  it("trial in the past is trial_expired", () => {
    const res = accessFor(profile("trial", "2026-06-20T12:00:00Z"), NOW);
    expect(res.state).toBe("trial_expired");
  });
});

describe("isPaywalled", () => {
  it("blocks expired / churned / past_due", () => {
    expect(isPaywalled({ state: "trial_expired", trialEndsAt: "x" })).toBe(true);
    expect(isPaywalled({ state: "churned" })).toBe(true);
    expect(isPaywalled({ state: "past_due" })).toBe(true);
  });
  it("allows active and trialing", () => {
    expect(isPaywalled({ state: "active" })).toBe(false);
    expect(
      isPaywalled({ state: "trialing", daysLeft: 3, trialEndsAt: "x" }),
    ).toBe(false);
  });
});

describe("canUseAi (server-side AI gate)", () => {
  it("permits only active and trialing", () => {
    expect(canUseAi({ state: "active" })).toBe(true);
    expect(canUseAi({ state: "trialing", daysLeft: 1, trialEndsAt: "x" })).toBe(
      true,
    );
    expect(canUseAi({ state: "trial_expired", trialEndsAt: "x" })).toBe(false);
    expect(canUseAi({ state: "past_due" })).toBe(false);
    expect(canUseAi({ state: "churned" })).toBe(false);
  });

  it("an expired trial cannot reach paid AI endpoints", () => {
    const access = accessFor(profile("trial", "2026-06-01T00:00:00Z"), NOW);
    expect(canUseAi(access)).toBe(false);
  });
});
