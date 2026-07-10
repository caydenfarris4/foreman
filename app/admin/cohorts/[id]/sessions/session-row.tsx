"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CohortSession, Mentor } from "@/lib/database.types";

interface Props {
  session: CohortSession;
  mentors: Pick<Mentor, "id" | "name" | "title" | "company">[];
}

export function SessionRow({ session, mentors }: Props) {
  const [title, setTitle] = useState(session.title);
  const [meetingUrl, setMeetingUrl] = useState(session.meeting_url ?? "");
  const [mentorId, setMentorId] = useState(session.guest_mentor_id ?? "");
  const [prep, setPrep] = useState(session.prep_materials ?? "");
  const [recordingUrl, setRecordingUrl] = useState(
    session.recording_url ?? "",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [pending, startTransition] = useTransition();

  async function save(field: string, value: unknown) {
    setStatus("saving");
    startTransition(async () => {
      const res = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value === "" ? null : value }),
      });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  const localTime = new Date(session.scheduled_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  });

  return (
    <details className="rounded-lg border border-rule bg-chalk p-4 open:bg-paper2/30">
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="type-h2 leading-none text-ink">
            {String(session.session_number).padStart(2, "0")}
          </span>
          <div>
            <p className="type-label text-ink">{title}</p>
            <p className="type-caption text-graphite">{localTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mentorId ? (
            <Badge variant="oak" size="sm">
              Mentor
            </Badge>
          ) : null}
          {meetingUrl ? (
            <Badge variant="neutral" size="sm">
              Zoom
            </Badge>
          ) : null}
          <span className="type-caption text-graphite">
            {status === "saving"
              ? "saving…"
              : status === "saved"
                ? "saved"
                : status === "error"
                  ? "error"
                  : "edit"}
          </span>
        </div>
      </summary>

      <div className="mt-4 space-y-3 border-t border-rule pt-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save("title", title)}
            maxLength={200}
          />
        </Field>

        <Field label="Zoom URL">
          <Input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            onBlur={() => save("meeting_url", meetingUrl)}
            maxLength={500}
            placeholder="https://us02web.zoom.us/j/..."
          />
        </Field>

        <Field label="Guest mentor">
          <select
            value={mentorId}
            onChange={(e) => {
              setMentorId(e.target.value);
              save("guest_mentor_id", e.target.value || null);
            }}
            className="h-10 w-full rounded-md border border-rule bg-chalk px-3 type-body-sm text-ink2"
          >
            <option value="">— none —</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.title ? `, ${m.title}` : ""}
                {m.company ? ` @ ${m.company}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Prep materials (markdown OK)">
          <Textarea
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            onBlur={() => save("prep_materials", prep)}
            rows={5}
            maxLength={20000}
          />
        </Field>

        <Field label="Recording URL (post-session)">
          <Input
            type="url"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
            onBlur={() => save("recording_url", recordingUrl)}
            maxLength={500}
          />
        </Field>

        <p className="type-caption text-graphite">
          Scheduled at {localTime}. Schedule changes aren&apos;t supported
          yet — recreate the cohort if dates shift.
        </p>
      </div>
    </details>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="type-cap text-graphite">{label}</label>
      {children}
    </div>
  );
}
