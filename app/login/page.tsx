import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/wordmark";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_MAX_LEN, PASSWORD_MAX_LEN } from "@/lib/validation";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (
    !email ||
    email.length > EMAIL_MAX_LEN ||
    !password ||
    password.length > PASSWORD_MAX_LEN
  ) {
    redirect("/login?error=Email%20and%20password%20required");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Could%20not%20sign%20in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  redirect(
    (profile as { onboarded_at: string | null } | null)?.onboarded_at
      ? "/app"
      : "/onboarding",
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Wordmark />
        </div>
        <div className="mb-2 h-[2px] w-7 bg-oak" />
        <p className="type-cap text-oak-dim">RETURNING BUILDER</p>
        <h1 className="type-h1 mt-2 text-ink">Welcome back.</h1>
        <p className="type-body mt-3 text-graphite">
          Pick up where you left off. The site&apos;s still under construction.
        </p>

        <form action={login} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="type-label text-ink2">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="type-label text-ink2">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {params.error ? (
            <p className="type-caption text-rust">{params.error}</p>
          ) : null}
          <Button type="submit" full size="lg">
            Log in
          </Button>
          <p className="type-caption text-center text-graphite">
            No account?{" "}
            <Link href="/signup" className="text-ink2 underline">
              Start a free trial
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
