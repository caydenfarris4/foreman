import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./shell";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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
    .select("onboarded_at, name, email")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as {
    onboarded_at: string | null;
    name: string | null;
    email: string;
  } | null;

  if (!profile?.onboarded_at) redirect("/onboarding");

  const initials = (profile.name ?? user.email ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";

  return (
    <AppShell initials={initials} signOut={signOut}>
      {children}
    </AppShell>
  );
}
