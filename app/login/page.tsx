import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/wordmark";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_MAX_LEN, PASSWORD_MAX_LEN } from "@/lib/validation";
import {
  credentialsWellFormed,
  isEmailNotConfirmedError,
  safeEmailHint,
} from "@/lib/auth/login";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!credentialsWellFormed(email, password)) {
    redirect("/login?error=Email%20and%20password%20required");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Login failed", error.message);
    // Email-not-confirmed is the one auth error that needs a specific
    // response — otherwise the user gets a misleading "wrong password"
    // when the real issue is they need to click the email link.
    // Everything else stays generic to avoid account enumeration.
    if (isEmailNotConfirmedError(error)) {
      redirect(`/login?notice=confirm&email=${encodeURIComponent(email)}`);
    }
    redirect("/login?error=Invalid%20email%20or%20password");
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

async function switchAccount() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const showConfirmNotice = params.notice === "confirm";
  const emailHint = safeEmailHint(params.email);

  // Already signed in on this device? Sessions persist like any social app,
  // but whose session it is stays explicit: continue as that account or
  // switch — never a silent redirect into it.
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (sessionUser) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("name, email, onboarded_at")
      .eq("id", sessionUser.id)
      .maybeSingle();
    const profile = profileRow as {
      name: string | null;
      email: string | null;
      onboarded_at: string | null;
    } | null;
    const who = profile?.name || profile?.email || sessionUser.email || "your account";
    const destination = profile?.onboarded_at ? "/app" : "/onboarding";

    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <Wordmark />
          </div>
          <div className="mb-2 h-[2px] w-7 bg-oak" />
          <p className="type-cap text-oak-dim">ALREADY ON SITE</p>
          <h1 className="type-h1 mt-2 text-ink">Welcome back.</h1>
          <p className="type-body mt-3 text-graphite">
            You&apos;re signed in on this device as{" "}
            <span className="font-medium text-ink">{who}</span>.
          </p>
          <div className="mt-8 space-y-3">
            <Button asChild full size="lg">
              <Link href={destination}>Continue as {who}</Link>
            </Button>
            <form action={switchAccount}>
              <Button type="submit" variant="secondary" full size="lg">
                Use a different account
              </Button>
            </form>
          </div>
          <p className="type-caption mt-6 text-center text-graphite">
            Switching signs this device out first, then brings you back here to
            log in.
          </p>
        </div>
      </main>
    );
  }

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

        {showConfirmNotice ? (
          <div className="mt-6 rounded-md border border-rule bg-oak-wash p-4">
            <p className="type-cap text-oak-dim">CONFIRM YOUR EMAIL FIRST</p>
            <p className="type-body-sm mt-2 text-ink2">
              {emailHint ? (
                <>
                  Open the confirmation email we sent to{" "}
                  <span className="font-medium text-ink">{emailHint}</span>{" "}
                  and click the link. Then come back here to log in.
                </>
              ) : (
                "Check your inbox for the confirmation email and click the link before signing in."
              )}
            </p>
          </div>
        ) : null}

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
              maxLength={EMAIL_MAX_LEN}
              defaultValue={emailHint ?? ""}
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
              maxLength={PASSWORD_MAX_LEN}
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
