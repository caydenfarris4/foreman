import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/wordmark";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_MAX_LEN,
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
} from "@/lib/validation";

async function signup(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (
    !email ||
    email.length > EMAIL_MAX_LEN ||
    !email.includes("@") ||
    password.length < PASSWORD_MIN_LEN ||
    password.length > PASSWORD_MAX_LEN
  ) {
    redirect(
      `/signup?error=${encodeURIComponent(
        `Use a valid email and a password between ${PASSWORD_MIN_LEN} and ${PASSWORD_MAX_LEN} characters.`,
      )}`,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/onboarding");
  redirect("/login?error=Check%20your%20email%20to%20confirm%20your%20account");
}

export default async function SignupPage({
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
        <p className="type-cap text-oak-dim">START YOUR BUILD</p>
        <h1 className="type-h1 mt-2 text-ink">Start your 14-day trial.</h1>
        <p className="type-body mt-3 text-graphite">
          No credit card. Cancel anytime. Pauses on your sabbath day.
        </p>

        <form action={signup} className="mt-8 space-y-4">
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
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="type-caption text-graphite">
              Eight characters or more.
            </p>
          </div>
          {params.error ? (
            <p className="type-caption text-rust">{params.error}</p>
          ) : null}
          <Button type="submit" full size="lg">
            Create account
          </Button>
          <p className="type-caption text-center text-graphite">
            Already have an account?{" "}
            <Link href="/login" className="text-ink2 underline">
              Log in
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
