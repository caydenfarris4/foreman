"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
}

interface Props {
  situationId: string;
  initialTitle: string;
  initialSituation: string;
  initialTags: string[];
  initialNotes: NoteRow[];
}

export function SituationActions({
  situationId,
  initialTitle,
  initialSituation,
  initialTags,
  initialNotes,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [situation, setSituation] = useState(initialSituation);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function saveEdits() {
    setError(null);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
    startTransition(async () => {
      const res = await fetch(`/api/library/${situationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, situation, tags }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save changes.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  async function deleteSituation() {
    if (
      !confirm(
        "Delete this situation? The coaching and any notes go with it. This can't be undone.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/library/${situationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not delete.");
        return;
      }
      router.push("/app/library");
    });
  }

  async function addNote() {
    const body = noteBody.trim();
    if (body.length < 1) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/library/${situationId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save note.");
        return;
      }
      const j = (await res.json()) as { note: NoteRow };
      setNotes((prev) => [...prev, j.note]);
      setNoteBody("");
    });
  }

  async function deleteNote(noteId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/library/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });
  }

  return (
    <div className="space-y-6">
      {/* Edit / delete row */}
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button
              type="button"
              size="md"
              onClick={saveEdits}
              disabled={pending}
            >
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setEditing(false);
                setTitle(initialTitle);
                setSituation(initialSituation);
                setTagsInput(initialTags.join(", "));
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={deleteSituation}
              disabled={pending}
              className="text-rust hover:text-rust"
            >
              Delete
            </Button>
          </>
        )}
        {error ? (
          <span className="type-caption text-rust">{error}</span>
        ) : null}
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="space-y-3 rounded-lg border border-rule bg-chalk p-5">
          <div className="space-y-1.5">
            <label className="type-cap text-graphite">TITLE</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <label className="type-cap text-graphite">WHAT HAPPENED</label>
            <Textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={6}
              maxLength={8000}
            />
          </div>
          <div className="space-y-1.5">
            <label className="type-cap text-graphite">
              TAGS (comma-separated)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="feedback, 1:1, hard-conversation"
            />
          </div>
        </div>
      ) : null}

      {/* Notes */}
      <div className="space-y-3">
        <p className="type-cap text-graphite">
          NOTES{notes.length > 0 ? ` · ${notes.length}` : ""}
        </p>
        {notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="group rounded-md border border-rule bg-paper2/40 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <Badge variant="neutral" size="sm">
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => deleteNote(n.id)}
                    className="type-caption text-graphite opacity-0 transition-opacity hover:text-rust group-hover:opacity-100"
                    disabled={pending}
                  >
                    delete
                  </button>
                </div>
                <p className="type-body mt-2 whitespace-pre-wrap text-ink2">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-2 rounded-md border border-rule bg-chalk p-3">
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="How it played out. What changed your mind. Anything to remember."
            rows={3}
            maxLength={4000}
          />
          <div className="flex items-center justify-between">
            <span className="type-caption text-graphite">
              {noteBody.trim().length} / 4000
            </span>
            <Button
              type="button"
              size="sm"
              onClick={addNote}
              disabled={pending || noteBody.trim().length === 0}
            >
              Add note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
