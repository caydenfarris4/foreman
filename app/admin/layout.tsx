import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { requireAdminPage } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule bg-ink text-chalk">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <Wordmark />
            <span className="type-cap text-chalk/70">ADMIN</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/admin/cohorts"
              className="type-label text-chalk/70 hover:text-chalk"
            >
              Cohorts
            </Link>
            <Link
              href="/admin/mentors"
              className="type-label text-chalk/70 hover:text-chalk"
            >
              Mentors
            </Link>
            <Link
              href="/app"
              className="type-label text-chalk/70 hover:text-chalk"
            >
              ← Back to app
            </Link>
          </nav>
        </div>
      </header>
      <div className="container max-w-4xl pb-12 pt-6">{children}</div>
    </div>
  );
}
