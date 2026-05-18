import type { Profile } from "@/lib/database.types";

export type AccessState =
  | { state: "active" }
  | { state: "trialing"; daysLeft: number; trialEndsAt: string }
  | { state: "trial_expired"; trialEndsAt: string }
  | { state: "past_due" }
  | { state: "churned" };

export function accessFor(
  profile: Pick<Profile, "subscription_status" | "trial_ends_at">,
  now: Date = new Date(),
): AccessState {
  if (profile.subscription_status === "active") {
    return { state: "active" };
  }
  if (profile.subscription_status === "past_due") {
    return { state: "past_due" };
  }
  if (profile.subscription_status === "churned") {
    return { state: "churned" };
  }
  // status === 'trial'
  const ends = new Date(profile.trial_ends_at);
  if (ends.getTime() > now.getTime()) {
    const daysLeft = Math.max(
      0,
      Math.ceil((ends.getTime() - now.getTime()) / 86_400_000),
    );
    return { state: "trialing", daysLeft, trialEndsAt: profile.trial_ends_at };
  }
  return { state: "trial_expired", trialEndsAt: profile.trial_ends_at };
}

export function isPaywalled(access: AccessState): boolean {
  return (
    access.state === "trial_expired" ||
    access.state === "churned" ||
    access.state === "past_due"
  );
}

// True when the user is allowed to use the AI-backed endpoints. Mirrors
// the UI paywall but enforced server-side on the routes that cost money
// (Claude calls). Trial + active subscriptions pass; expired/past-due/
// churned do not.
export function canUseAi(access: AccessState): boolean {
  return access.state === "active" || access.state === "trialing";
}
