import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Cohort, CohortParticipant, Profile } from "@/lib/database.types";
import { isUuid } from "@/lib/validation";
import { ApplicationActions } from "./application-actions";

export default async function AdminApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("id, name, slug")
    .eq("id", id)
    .maybeSingle();
  const cohort = cohortRow as Pick<Cohort, "id" | "name" | "slug"> | null;
  if (!cohort) notFound();

  const { data: appsRows } = await supabase
    .from("cohort_participants")
    .select(
      "id, user_id, application_text, why_joining, current_team_size, current_challenge, status, applied_at, accepted_at",
    )
    .eq("cohort_id", id)
    .order("applied_at", { ascending: true });
  const apps = (appsRows ?? []) as Pick<
    CohortParticipant,
    | "id"
    | "user_id"
    | "application_text"
    | "why_joining"
    | "current_team_size"
    | "current_challenge"
    | "status"
    | "applied_at"
    | "accepted_at"
  >[];

  // Fetch applicant profiles in one shot.
  const userIds = apps.map((a) => a.user_id);
  const { data: profileRows } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, name, email, role_title, team_size, current_challenge, subscription_status",
          )
          .in("id", userIds)
      : { data: [] };
  const profilesById = new Map<string, Partial<Profile>>();
  for (const p of (profileRows ?? []) as Partial<Profile>[]) {
    if (p.id) profilesById.set(p.id, p);
  }

  const buckets = {
    pending: apps.filter((a) => a.status === "applied"),
    accepted: apps.filter((a) => a.status === "accepted"),
    paid: apps.filter((a) =>
      ["paid", "enrolled", "completed"].includes(a.status),
    ),
    rejected: apps.filter((a) => a.status === "rejected"),
    other: apps.filter((a) => a.status === "withdrew"),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="type-cap text-graphite">
          <Link
            href={`/admin/cohorts/${cohort.id}`}
            className="underline hover:text-ink"
          >
            ← {cohort.name}
          </Link>
        </p>
        <h1 className="type-h1 mt-1 text-ink">Applications</h1>
      </div>

      {buckets.pending.length > 0 ? (
        <Section title="PENDING" highlight>
          {buckets.pending.map((a) => (
            <ApplicationRow
              key={a.id}
              app={a}
              profile={profilesById.get(a.user_id)}
            />
          ))}
        </Section>
      ) : null}

      {buckets.accepted.length > 0 ? (
        <Section title="ACCEPTED (awaiting payment)">
          {buckets.accepted.map((a) => (
            <ApplicationRow
              key={a.id}
              app={a}
              profile={profilesById.get(a.user_id)}
            />
          ))}
        </Section>
      ) : null}

      {buckets.paid.length > 0 ? (
        <Section title="PAID / ENROLLED">
          {buckets.paid.map((a) => (
            <ApplicationRow
              key={a.id}
              app={a}
              profile={profilesById.get(a.user_id)}
              compact
            />
          ))}
        </Section>
      ) : null}

      {buckets.rejected.length + buckets.other.length > 0 ? (
        <Section title="REJECTED / WITHDREW">
          {[...buckets.rejected, ...buckets.other].map((a) => (
            <ApplicationRow
              key={a.id}
              app={a}
              profile={profilesById.get(a.user_id)}
              compact
            />
          ))}
        </Section>
      ) : null}

      {apps.length === 0 ? (
        <p className="type-body text-graphite">No applications yet.</p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  highlight,
  children,
}: {
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className={
          highlight ? "type-cap text-rust" : "type-cap text-graphite"
        }
      >
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ApplicationRow({
  app,
  profile,
  compact,
}: {
  app: Pick<
    CohortParticipant,
    | "id"
    | "user_id"
    | "application_text"
    | "why_joining"
    | "current_team_size"
    | "current_challenge"
    | "status"
    | "applied_at"
    | "accepted_at"
  >;
  profile: Partial<Profile> | undefined;
  compact?: boolean;
}) {
  const applied = new Date(app.applied_at);
  const daysAgo = Math.floor(
    (Date.now() - applied.getTime()) / (24 * 60 * 60 * 1000),
  );
  return (
    <div className="rounded-lg border border-rule bg-chalk p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="type-label text-ink">
            {profile?.name ?? "—"}{" "}
            <span className="type-caption text-graphite">
              · {profile?.email ?? ""}
            </span>
          </p>
          <p className="type-caption text-graphite">
            {profile?.role_title ?? "—"} · team{" "}
            {profile?.team_size ?? "?"} ·{" "}
            {applied.toLocaleDateString()} ({daysAgo}d ago)
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          {app.status}
        </Badge>
      </div>

      {!compact ? (
        <>
          <div className="mt-3 space-y-3 border-t border-rule pt-3">
            <Field
              label="THE SITUATION THEY WROTE"
              body={app.application_text}
            />
            {app.why_joining ? (
              <Field label="WHY THIS COHORT" body={app.why_joining} />
            ) : null}
            {app.current_challenge ? (
              <Field
                label="BIGGEST CHALLENGE"
                body={app.current_challenge}
              />
            ) : null}
            {profile?.current_challenge ? (
              <Field
                label="FROM ONBOARDING"
                body={profile.current_challenge}
              />
            ) : null}
          </div>
          <div className="mt-4">
            <ApplicationActions
              applicationId={app.id}
              status={app.status}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="type-cap text-graphite">{label}</p>
      <p className="type-body mt-1 whitespace-pre-wrap text-ink2">{body}</p>
    </div>
  );
}
