"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INSPECTION_LAYERS,
  PRINCIPLES,
  principleByKey,
} from "@/lib/inspection/principles";
import type { InspectionLayer, PrincipleMapping } from "@/lib/database.types";
import { saveMapping } from "./actions";

interface Entry {
  principle: string;
  layer: InspectionLayer;
  rationale: string;
  source: "ai" | "user";
  checked: boolean;
}

export function PrincipleMapper({
  planId,
  existing,
}: {
  planId: string;
  existing: Pick<PrincipleMapping, "principle" | "layer" | "ai_rationale" | "source">[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(
    existing.map((m) => ({
      principle: m.principle,
      layer: (m.layer ?? "frame") as InspectionLayer,
      rationale: m.ai_rationale ?? "",
      source: m.source,
      checked: true,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [mapping, startMap] = useTransition();
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState(false);

  function runMapping() {
    setError(null);
    setSavedAt(false);
    startMap(async () => {
      try {
        const res = await fetch("/api/plan/map", { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Mapping failed.");
          return;
        }
        const suggested = json.mappings as {
          principle: string;
          layer: InspectionLayer;
          rationale: string;
        }[];
        setEntries((prev) => {
          const byKey = new Map(prev.map((e) => [e.principle, e]));
          for (const s of suggested) {
            const cur = byKey.get(s.principle);
            if (cur) {
              cur.layer = s.layer;
              cur.rationale = s.rationale || cur.rationale;
              cur.checked = true;
            } else {
              byKey.set(s.principle, {
                principle: s.principle,
                layer: s.layer,
                rationale: s.rationale,
                source: "ai",
                checked: true,
              });
            }
          }
          return [...byKey.values()];
        });
      } catch {
        setError("Network problem. Try again.");
      }
    });
  }

  function toggle(principle: string) {
    setEntries((p) =>
      p.map((e) =>
        e.principle === principle ? { ...e, checked: !e.checked } : e,
      ),
    );
  }

  function addPrinciple(principle: string) {
    if (!principle) return;
    setEntries((p) =>
      p.some((e) => e.principle === principle)
        ? p
        : [
            ...p,
            { principle, layer: "frame", rationale: "", source: "user", checked: true },
          ],
    );
  }

  function save() {
    setError(null);
    const chosen = entries.filter((e) => e.checked);
    if (chosen.length === 0) {
      setError("Pick at least one principle.");
      return;
    }
    startSave(async () => {
      const res = await saveMapping({
        plan_id: planId,
        mappings: chosen.map((e) => ({
          principle: e.principle,
          layer: e.layer,
          rationale: e.rationale,
          source: e.source,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(true);
      router.refresh();
    });
  }

  const unused = PRINCIPLES.filter(
    (p) => !entries.some((e) => e.principle === p.key),
  );

  return (
    <div className="space-y-4 rounded-lg border border-rule bg-chalk p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="type-cap text-oak-dim">PLAN · PRINCIPLE MAP</p>
          <h3 className="type-h2 mt-1 text-ink">What your plan is built on</h3>
          <p className="type-body-sm mt-1 text-graphite">
            Foreman proposes a mapping. You have the final say.
          </p>
        </div>
        <Button
          onClick={runMapping}
          disabled={mapping}
          variant="secondary"
          size="sm"
        >
          {mapping ? (
            <>
              <Spinner /> Mapping…
            </>
          ) : entries.length ? (
            "Re-map with AI"
          ) : (
            "Map with AI"
          )}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="type-body-sm text-graphite">
          No mapping yet. Map your plan with AI, or add principles by hand below.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const def = principleByKey(e.principle as never);
            return (
              <li
                key={e.principle}
                className={cn(
                  "rounded-md border px-3 py-2.5",
                  e.checked ? "border-ink/30 bg-paper2/40" : "border-rule opacity-60",
                )}
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={e.checked}
                    onChange={() => toggle(e.principle)}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="type-label text-ink">{def.name}</span>
                      <span className="type-cap text-graphite">· {e.layer}</span>
                      {e.source === "user" ? (
                        <span className="type-cap text-oak-dim">· you</span>
                      ) : null}
                    </span>
                    {e.rationale ? (
                      <span className="type-caption mt-0.5 block text-graphite">
                        {e.rationale}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {unused.length ? (
        <div>
          <label htmlFor="add-principle" className="type-cap text-graphite">
            ADD A PRINCIPLE
          </label>
          <select
            id="add-principle"
            value=""
            onChange={(e) => addPrinciple(e.target.value)}
            className="mt-1 block w-full rounded-md border border-rule bg-paper px-3 py-2 text-[14px] text-ink"
          >
            <option value="">Choose one…</option>
            {unused.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="type-caption text-rust">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} size="md">
          {saving ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Confirm mapping"
          )}
        </Button>
        {savedAt ? (
          <span className="type-caption text-moss">Saved.</span>
        ) : null}
      </div>
    </div>
  );
}

// Re-exported for type help in the layer select (kept simple — layers are
// rarely edited by hand, but the vocabulary lives in one place).
export const LAYER_OPTIONS = INSPECTION_LAYERS.map((l) => l.key);
