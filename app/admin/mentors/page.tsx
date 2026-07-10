import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPage } from "@/lib/admin";
import type { Mentor } from "@/lib/database.types";
import { MentorList, NewMentorForm } from "./mentor-controls";

export default async function AdminMentorsPage() {
  await requireAdminPage();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("mentors")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  const mentors = (data ?? []) as Mentor[];

  return (
    <div className="space-y-8">
      <div>
        <p className="type-cap text-graphite">MENTORS</p>
        <h1 className="type-h1 mt-1 text-ink">Roster</h1>
        <p className="type-body mt-2 text-graphite">
          Guest mentors for cohort sessions. Inactive mentors stay in the
          database but don&apos;t appear in public cohort pages or in the
          session assignment dropdown.
        </p>
      </div>

      <section className="space-y-3">
        <p className="type-cap text-graphite">ACTIVE</p>
        <MentorList
          mentors={mentors.filter((m) => m.active)}
          activeBucket
        />
        {mentors.filter((m) => m.active).length === 0 ? (
          <p className="type-body text-graphite">
            No active mentors. Add one below.
          </p>
        ) : null}
      </section>

      {mentors.some((m) => !m.active) ? (
        <section className="space-y-3">
          <p className="type-cap text-graphite">INACTIVE</p>
          <MentorList mentors={mentors.filter((m) => !m.active)} />
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="type-cap text-graphite">ADD A MENTOR</p>
        <NewMentorForm />
      </section>
    </div>
  );
}

