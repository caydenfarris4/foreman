import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/validation";

// Handles the OAuth/PKCE redirect from Supabase email confirmations.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Reject any `next` that isn't an in-app path. Prevents open-redirect
  // tricks like ?next=//evil.com, ?next=@evil.com, ?next=/\evil.com.
  const nextRaw = searchParams.get("next");
  const next = isSafeRedirectPath(nextRaw) ? nextRaw : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could%20not%20sign%20in`);
}
