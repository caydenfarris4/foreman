"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/cohorts";

const TODAY = new Date().toISOString().slice(0, 10);

export function NewCohortForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [capacity, setCapacity] = useState("12");
  const [priceCents, setPriceCents] = useState("80000");
  const [discountCents, setDiscountCents] = useState("15000");
  const [stripeProduct, setStripeProduct] = useState("");
  const [stripePriceStd, setStripePriceStd] = useState("");
  const [stripePriceSub, setStripePriceSub] = useState("");
  const [heroQuote, setHeroQuote] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function submit() {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          start_date: startDate,
          end_date: endDate,
          capacity: Number(capacity),
          price_cents: Number(priceCents),
          subscriber_discount_cents: Number(discountCents),
          stripe_product_id: stripeProduct || undefined,
          stripe_price_id_standard: stripePriceStd || undefined,
          stripe_price_id_subscriber: stripePriceSub || undefined,
          hero_quote: heroQuote || undefined,
          curriculum_summary: summary || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not create the cohort.");
        return;
      }
      if (json.warning) setWarning(json.warning);
      router.push(`/admin/cohorts/${json.cohort_id}`);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-rule bg-chalk p-5">
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Cohort 01 — Winter 2026"
          maxLength={120}
        />
      </Field>
      <Field
        label="Slug"
        hint="URL path: /cohorts/<slug>. Lowercase, hyphens only."
      >
        <Input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="cohort-01-winter-2026"
          maxLength={60}
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="One paragraph for the cohort detail page."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date (first Saturday)">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="End date">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Capacity">
          <Input
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Field>
        <Field label="Price (cents)">
          <Input
            type="number"
            min={0}
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
          />
        </Field>
        <Field label="Subscriber discount (cents)">
          <Input
            type="number"
            min={0}
            value={discountCents}
            onChange={(e) => setDiscountCents(e.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-2 rounded-md border border-rule bg-paper2/40 p-3">
        <p className="type-cap text-graphite">STRIPE IDS (optional now)</p>
        <Field label="Product ID (prod_...)">
          <Input
            value={stripeProduct}
            onChange={(e) => setStripeProduct(e.target.value)}
            placeholder="prod_xxx"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Standard price (price_...)">
            <Input
              value={stripePriceStd}
              onChange={(e) => setStripePriceStd(e.target.value)}
              placeholder="price_xxx"
            />
          </Field>
          <Field label="Subscriber price (price_...)">
            <Input
              value={stripePriceSub}
              onChange={(e) => setStripePriceSub(e.target.value)}
              placeholder="price_xxx"
            />
          </Field>
        </div>
      </div>

      <Field label="Hero quote (for the cohort detail page)">
        <Input
          value={heroQuote}
          onChange={(e) => setHeroQuote(e.target.value)}
          maxLength={500}
        />
      </Field>
      <Field label="Curriculum summary">
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          maxLength={2000}
        />
      </Field>

      {error ? (
        <p className="type-caption text-rust">{error}</p>
      ) : null}
      {warning ? (
        <p className="type-caption text-amber">{warning}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Spinner /> Creating
            </>
          ) : (
            "Create cohort (status: draft)"
          )}
        </Button>
        <span className="type-caption text-graphite">
          Cohort starts as <code>draft</code> — flip to <code>open</code>{" "}
          when you&apos;re ready to accept applications.
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="type-label text-ink2">{label}</label>
      {children}
      {hint ? <p className="type-caption text-graphite">{hint}</p> : null}
    </div>
  );
}
