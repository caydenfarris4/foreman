import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Page-level admin gate. Use at the top of any admin server component.
// Returns the supabase client and the auth user when the caller is an
// admin; throws notFound() (404) otherwise — deliberately doesn't reveal
// that the route exists.
export async function requireAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(data as { is_admin: boolean } | null)?.is_admin) {
    notFound();
  }
  return { user, supabase };
}

// API-level admin gate. Returns either the resolved supabase + user
// pair, or a NextResponse that the caller should return verbatim.
export async function requireAdminApi(): Promise<
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string; email?: string };
    }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(data as { is_admin: boolean } | null)?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, supabase, user };
}
