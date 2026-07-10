"use client";

// Editable profile settings: identity, focus, and the rhythm fields (sabbath,
// retro day, prompt time, timezone) that drive the daily cadence and crons.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { updateSettings } from "./actions";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface SettingsFormValues {
  name: string;
  role_title: string;
  current_challenge: string;
  sabbath_day: string;
  retro_day: string;
  /** HH:MM */
  notification_time: string;
  timezone: string;
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<
    { kind: "saved" } | { kind: "error"; message: string } | null
  >(null);

  const timezones = useMemo(() => {
    const zones =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [];
    return zones.includes(initial.timezone) || zones.length === 0
      ? zones
      : [initial.timezone, ...zones];
  }, [initial.timezone]);

  function set<K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus(null);
  }

  function save() {
    start(async () => {
      const res = await updateSettings(values);
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setStatus({ kind: "saved" });
      router.refresh();
    });
  }

  const fieldClass =
    "type-body mt-1.5 w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none focus:border-blueprint";

  return (
    <div className="rounded-lg border border-rule bg-chalk p-5">
      <p className="type-cap text-graphite">PROFILE &amp; RHYTHM</p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="type-cap text-graphite">Name</span>
          <input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="type-cap text-graphite">Role</span>
          <input
            value={values.role_title}
            onChange={(e) => set("role_title", e.target.value)}
            maxLength={120}
            placeholder="e.g. Engineering manager"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="type-cap text-graphite">Current focus</span>
          <textarea
            value={values.current_challenge}
            onChange={(e) => set("current_challenge", e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="The one thing you're working on right now"
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="type-cap text-graphite">Sabbath day</span>
            <select
              value={values.sabbath_day}
              onChange={(e) => set("sabbath_day", e.target.value)}
              className={fieldClass}
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {cap(d)}
                </option>
              ))}
              <option value="none">None</option>
            </select>
          </label>

          <label className="block">
            <span className="type-cap text-graphite">Retro day</span>
            <select
              value={values.retro_day}
              onChange={(e) => set("retro_day", e.target.value)}
              className={fieldClass}
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {cap(d)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="type-cap text-graphite">Daily prompt time</span>
            <input
              type="time"
              value={values.notification_time}
              onChange={(e) => set("notification_time", e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="type-cap text-graphite">Timezone</span>
            {timezones.length ? (
              <select
                value={values.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                className={fieldClass}
              >
                {timezones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={values.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                maxLength={64}
                className={fieldClass}
              />
            )}
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={pending} size="md">
          {pending ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {status?.kind === "saved" ? (
          <span className="type-caption text-moss">Saved.</span>
        ) : null}
        {status?.kind === "error" ? (
          <span className="type-caption text-rust">{status.message}</span>
        ) : null}
      </div>
    </div>
  );
}
