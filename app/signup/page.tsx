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
  isSafeRedirectPath,
} from "@/lib/validation";

async function signup(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const next = isSafeRedirectPath(nextRaw) ? nextRaw : null;

  if (
    !email ||
    email.length > EMAIL_MAX_LEN ||
    !email.includes("@") ||
    password.length < PASSWORD_MIN_LEN ||
    password.length > PASSWORD_MAX_LEN
  ) {
    const qs = new URLSearchParams({
      error: `Use a valid email and a password between ${PASSWORD_MIN_LEN} and ${PASSWORD_MAX_LEN} characters.`,
    });
    if (next) qs.set("next", next);
    redirect(`/signup?${qs.toString()}`);
  }

  // Bake the post-confirmation landing URL into the email link so the
  // user lands wherever they came from (or /onboarding by default).
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", appUrl);
  if (next) callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });
  if (error) {
    console.error("Signup failed", error.message);
    const qs = new URLSearchParams({
      error:
        "Could not create your account. Try again or use a different email.",
    });
    if (next) qs.set("next", next);
    redirect(`/signup?${qs.toString()}`);
  }

  // Two outcomes:
  //   1. Email confirmation OFF: a session exists -> jump to next/onboarding.
  //   2. Email confirmation ON: signUp succeeds but no session yet —
  //      show the "check your email" state so the user knows what to do.
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next ?? "/onboarding");
  const qs = new URLSearchParams({ sent: "1", email });
  if (next) qs.set("next", next);
  redirect(`/signup?${qs.toString()}`);
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    email?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const sentToEmail =
    typeof params.email === "string" && params.email.includes("@")
      ? params.email.slice(0, EMAIL_MAX_LEN)
      : null;
  const next = isSafeRedirectPath(params.next) ? params.next : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Wordmark />
        </div>
        {sent ? (
          <CheckEmailState email={sentToEmail} />
        ) : (
          <SignupForm errorMessage={params.error} next={next} />
        )}
      </div>
    </main>
  );
}

function SignupForm({
  errorMessage,
  next,
}: {
  errorMessage: string | undefined;
  next: string | null;
}) {
  return (
    <>
      <div className="mb-2 h-[2px] w-7 bg-oak" />
      <p className="type-cap text-oak-dim">START YOUR BUILD</p>
      <h1 className="type-h1 mt-2 text-ink">Start your 14-day trial.</h1>
      <p className="type-body mt-3 text-graphite">
        No credit card. Cancel anytime. A sabbath set apart for reflection.
      </p>

      <form action={signup} className="mt-8 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
            maxLength={EMAIL_MAX_LEN}
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
            minLength={PASSWORD_MIN_LEN}
            maxLength={PASSWORD_MAX_LEN}
            required
          />
          <p className="type-caption text-graphite">
            Eight characters or more.
          </p>
        </div>

        <div className="rounded-md border border-rule bg-paper2/40 p-3">
          <p className="type-caption text-ink2">
            <span className="type-cap mr-1 text-oak-dim">NEXT STEP</span>
            We&apos;ll send a confirmation link to your email. Click it
            to activate your account, then you&apos;ll land on onboarding.
          </p>
        </div>

        {errorMessage ? (
          <p className="type-caption text-rust">{errorMessage}</p>
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
    </>
  );
}

function CheckEmailState({ email }: { email: string | null }) {
  return (
    <>
      <div className="mb-2 h-[2px] w-7 bg-oak" />
      <p className="type-cap text-oak-dim">CHECK YOUR EMAIL</p>
      <h1 className="type-h1 mt-2 text-ink">
        We sent you a confirmation link.
      </h1>
      <p className="type-body mt-4 text-graphite">
        {email ? (
          <>
            Open the email we just sent to{" "}
            <span className="font-medium text-ink2">{email}</span> and
            click the confirmation link. That activates your account and
            lands you on onboarding.
          </>
        ) : (
          <>
            Open the email we just sent and click the confirmation link.
            That activates your account and lands you on onboarding.
          </>
        )}
      </p>

      <div className="mt-6 rounded-md border border-rule bg-chalk p-4">
        <p className="type-cap text-graphite">CAN&apos;T FIND IT?</p>
        <ul className="mt-2 space-y-1.5 type-body-sm text-ink2">
          <li>· Check your spam / promotions folder.</li>
          <li>· Wait a minute — it can take a moment to arrive.</li>
          <li>· The link is good for 24 hours.</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/login"
          className="type-label text-center text-graphite underline-offset-2 hover:text-ink hover:underline"
        >
          Already confirmed? Log in →
        </Link>
        <Link
          href="/signup"
          className="type-caption text-center text-graphite hover:text-ink"
        >
          Used the wrong email? Start over.
        </Link>
      </div>
    </>
  );
}
