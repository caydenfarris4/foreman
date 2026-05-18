import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { accessFor, isPaywalled } from "@/lib/billing";
import { hasActiveCohortAccess } from "@/lib/cohorts";
import type { Profile } from "@/lib/database.types";
import { AppShell } from "./shell";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const PAYWALL_BYPASS = ["/app/upgrade", "/app/settings"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "onboarded_at, name, email, subscription_status, trial_ends_at, is_admin",
    )
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as
    | Pick<
        Profile,
        | "onboarded_at"
        | "name"
        | "email"
        | "subscription_status"
        | "trial_ends_at"
        | "is_admin"
      >
    | null;

  if (!profile?.onboarded_at) redirect("/onboarding");

  const access = accessFor(profile);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onBypassRoute = PAYWALL_BYPASS.some((p) => pathname.startsWith(p));
  if (isPaywalled(access) && !onBypassRoute) {
    // Cohort participants get free app access through cohort.end_date
    // + 4 weeks. Honor that before redirecting to the paywall.
    const cohortBypass = await hasActiveCohortAccess(supabase, user.id);
    if (!cohortBypass) redirect("/app/upgrade");
  }

  const initials = (profile.name ?? user.email ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";

  const trialBanner =
    access.state === "trialing" && access.daysLeft <= 5
      ? {
          daysLeft: access.daysLeft,
        }
      : null;

  return (
    <AppShell
      initials={initials}
      signOut={signOut}
      trialBanner={trialBanner}
      isAdmin={profile.is_admin ?? false}
    >
      {children}
    </AppShell>
  );
}
