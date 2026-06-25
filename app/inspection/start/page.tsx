import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { GrowthOnboardingWizard } from "./wizard";

export const metadata = {
  title: "Set up your Growth Inspection",
};

export default async function InspectionStartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // First run only. If the user already has a current plan, send them to a
  // short confirmation rather than letting them build a second one.
  const { data: plan } = await supabase
    .from("growth_plans")
    .select("id, six_month_milestone")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();

  if (plan) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-5 py-16">
        <h1 className="type-h1 text-ink">Your inspection is set up</h1>
        <p className="text-ink2">
          Your plan and the principles you chose to master are saved. The first
          six-month walk reads your daily work against them. Keep working the
          cascade and we will do the rest.
        </p>
        <div>
          <Button asChild>
            <Link href="/app">Back to today</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <GrowthOnboardingWizard />;
}
