import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/app" className="font-serif text-lg tracking-tight">
            Foreman
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/app"
              className="text-muted-foreground hover:text-foreground"
            >
              Today
            </Link>
            <Link
              href="/app/library"
              className="text-muted-foreground hover:text-foreground"
            >
              Library
            </Link>
            <Link
              href="/app/retro"
              className="text-muted-foreground hover:text-foreground"
            >
              Retro
            </Link>
            <Link
              href="/app/settings"
              className="text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
