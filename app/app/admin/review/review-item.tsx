"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveInspection } from "./actions";

export function ReviewItem({
  inspectionId,
  draft,
}: {
  inspectionId: string;
  draft: string;
}) {
  const router = useRouter();
  const [report, setReport] = useState(draft);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      const res = await approveInspection({
        inspection_id: inspectionId,
        edited_report: editing ? report : undefined,
        cayden_note: note.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="type-cap text-graphite">DRAFT REPORT</p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="type-label text-graphite hover:text-ink"
          >
            {editing ? "Preview" : "Edit"}
          </button>
        </div>
        {editing ? (
          <Textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={12}
            className="mt-2"
          />
        ) : (
          <div className="mt-2 space-y-2 rounded-md border border-rule bg-paper2/40 p-3">
            {report.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="type-body-sm leading-[1.55] text-ink2">
                {p}
              </p>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="type-cap text-graphite">
          PERSONAL NOTE (optional, carried seamlessly)
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1"
          placeholder="A direct word to this builder. Scripture or testimony is fine here — this is you, not the algorithm."
        />
      </div>

      {error ? <p className="type-caption text-rust">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={send} disabled={pending} size="md">
          {pending ? (
            <>
              <Spinner /> Sending…
            </>
          ) : note.trim() || editing ? (
            "Send with your changes"
          ) : (
            "Approve & send"
          )}
        </Button>
      </div>
    </div>
  );
}
