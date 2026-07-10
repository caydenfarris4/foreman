import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

// "You" — the fifth Cornerstone tab. Profile header plus quiet rows to the
// surfaces that used to be top-level tabs (library, retro) and everything
// account-shaped. Structure-only hub: each destination keeps its own page.
async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const ROWS: { href: string; label: string; sub: string }[] = [
  { href: "/app/retro", label: "Weekly retro", sub: "Wins, struggles, lessons" },
  { href: "/app/retro/history", label: "Retro history", sub: "Past site reports" },
  { href: "/app/library", label: "Library", sub: "Every coaching session, searchable" },
  { href: "/app/inspection", label: "Growth inspection", sub: "Walk the site — every six months" },
  { href: "/app/settings", label: "Settings", sub: "Cadence, sabbath, notifications" },
  { href: "/app/upgrade", label: "Membership", sub: "Plan & billing" },
];

export default async function YouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("name, email, created_at")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Pick<
    Profile,
    "name" | "email" | "created_at"
  > | null;

  const name = profile?.name ?? "";
  const email = profile?.email ?? user.email ?? "";
  const initials =
    (name || email)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "·";
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6 px-3 pb-8 pt-6">
      <header className="flex items-center gap-4 px-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-moss-wash text-moss">
          <span className="type-h2">{initials}</span>
        </div>
        <div>
          <h1 className="type-h1 text-ink">{name || "Your account"}</h1>
          <p className="type-caption mt-0.5 text-graphite">
            {email}
            {since ? ` · building since ${since}` : ""}
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-rule bg-chalk">
        {ROWS.map((r, i) => (
          <Link
            key={r.href}
            href={r.href}
            className={
              "flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-paper2/50" +
              (i > 0 ? " border-t border-ruleSoft" : "")
            }
          >
            <span>
              <span className="type-label block text-ink">{r.label}</span>
              <span className="type-caption text-graphite">{r.sub}</span>
            </span>
            <span className="text-graphite">›</span>
          </Link>
        ))}
      </section>

      <form action={signOut} className="px-1">
        <button
          type="submit"
          className="type-label w-full rounded-lg border border-rule bg-chalk px-4 py-3.5 text-rust transition-colors hover:bg-rust-wash"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
