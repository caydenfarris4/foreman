"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Mentor } from "@/lib/database.types";

export function MentorList({
  mentors,
  activeBucket,
}: {
  mentors: Mentor[];
  activeBucket?: boolean;
}) {
  return (
    <div className="space-y-3">
      {mentors.map((m) => (
        <MentorCard key={m.id} mentor={m} canDeactivate={!!activeBucket} />
      ))}
    </div>
  );
}

function MentorCard({
  mentor,
  canDeactivate,
}: {
  mentor: Mentor;
  canDeactivate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mentor.name);
  const [title, setTitle] = useState(mentor.title ?? "");
  const [company, setCompany] = useState(mentor.company ?? "");
  const [bio, setBio] = useState(mentor.bio ?? "");
  const [linkedin, setLinkedin] = useState(mentor.linkedin_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/mentors/${mentor.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          title: title || null,
          company: company || null,
          bio: bio || null,
          linkedin_url: linkedin || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  async function reactivate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/mentors/${mentor.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not reactivate.");
        return;
      }
      router.refresh();
    });
  }

  async function deactivate() {
    if (!confirm(`Deactivate ${mentor.name}? They'll stop appearing in cohort pages.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/mentors/${mentor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not deactivate.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-rule bg-chalk p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="type-label text-ink">{mentor.name}</p>
          <p className="type-caption text-graphite">
            {[mentor.title, mentor.company].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <Badge variant={mentor.active ? "moss" : "neutral"} size="sm">
          {mentor.active ? "active" : "inactive"}
        </Badge>
      </div>

      {!editing ? (
        <>
          {mentor.bio ? (
            <p className="type-body-sm mt-3 text-ink2">{mentor.bio}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            {canDeactivate ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-rust hover:text-rust"
                onClick={deactivate}
                disabled={pending}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={reactivate}
                disabled={pending}
              >
                Reactivate
              </Button>
            )}
            {error ? (
              <span className="type-caption text-rust">{error}</span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
            />
          </div>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Bio"
            maxLength={2000}
          />
          <Input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="LinkedIn URL"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? (
                <>
                  <Spinner /> Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            {error ? (
              <span className="type-caption text-rust">{error}</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewMentorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function save() {
    if (name.trim().length < 2) {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/mentors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          title: title || undefined,
          company: company || undefined,
          bio: bio || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save.");
        return;
      }
      setName("");
      setTitle("");
      setCompany("");
      setBio("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-rule bg-chalk p-5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
        />
      </div>
      <Textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Bio — one or two sentences for the cohort detail page"
      />
      {error ? (
        <p className="type-caption text-rust">{error}</p>
      ) : null}
      <Button onClick={save} disabled={pending}>
        {pending ? (
          <>
            <Spinner /> Adding
          </>
        ) : (
          "Add mentor"
        )}
      </Button>
    </div>
  );
}
