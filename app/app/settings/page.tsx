import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Editable fields are coming in phase 6. For now, what's on file.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={profile?.name} />
          <Row label="Role" value={profile?.current_role} />
          <Row label="Team size" value={profile?.team_size?.toString()} />
          <Row label="Current phase" value={profile?.current_phase} />
          <Row label="Sabbath day" value={profile?.sabbath_day} />
          <Row label="Daily prompt time" value={profile?.notification_time} />
          <Row label="Timezone" value={profile?.timezone} />
          <Row label="Subscription" value={profile?.subscription_status} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
