import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = data as Profile | null;

  return (
    <div className="space-y-6 px-3 pb-8 pt-4">
      <div className="px-1">
        <p className="type-cap text-graphite">YOUR SITE</p>
        <h1 className="type-h1 mt-2 text-ink">Settings</h1>
        <p className="type-body mt-2 text-graphite">
          Editable fields are coming in phase 6. For now, what&apos;s on file.
        </p>
      </div>

      <div className="rounded-lg border border-rule bg-chalk p-5">
        <p className="type-cap text-graphite">PROFILE · {user.email}</p>
        <dl className="mt-4 grid grid-cols-1 divide-y divide-rule">
          <Row label="Name" value={profile?.name} />
          <Row label="Role" value={profile?.current_role} />
          <Row label="Team size" value={profile?.team_size?.toString()} />
          <Row label="Started managing" value={profile?.promoted_at} />
          <Row label="Current focus" value={profile?.current_challenge} />
          <Row label="Current phase" value={profile?.current_phase} />
          <Row label="Sabbath day" value={profile?.sabbath_day} />
          <Row label="Retro day" value={profile?.retro_day} />
          <Row
            label="Daily prompt time"
            value={profile?.notification_time?.slice(0, 5)}
          />
          <Row label="Timezone" value={profile?.timezone} />
          <Row label="Subscription" value={profile?.subscription_status} />
        </dl>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="type-cap text-graphite">{label}</dt>
      <dd className="type-body text-ink">{value || "—"}</dd>
    </div>
  );
}
