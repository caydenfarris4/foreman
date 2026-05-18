import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, isActiveSubscriptionStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Webhook signing not configured" },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Idempotency: Stripe can deliver the same event_id more than once.
  // Insert into stripe_webhook_events first; if it collides, no-op.
  const { error: idemError } = await admin
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
    });
  if (idemError && idemError.code === "23505") {
    // Already processed — return 200 so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (idemError) {
    console.error("Idempotency insert failed", idemError.message);
    // Fall through — better to risk a double-handle than fail the webhook.
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = (session.metadata?.type as string | undefined) ?? "";

        // ---------- Cohort one-time purchase ---------------------------
        if (type === "cohort") {
          await handleCohortCheckout(admin, session);
          break;
        }

        // ---------- Subscription (existing flow) ------------------------
        const userId =
          (session.metadata?.user_id as string | undefined) ??
          (session.client_reference_id as string | undefined);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!userId) {
          console.error(
            "checkout.session.completed without user_id",
            session.id,
          );
          break;
        }
        const update: Record<string, unknown> = {
          subscription_status: "active",
        };
        if (customerId) update.stripe_customer_id = customerId;
        if (subscriptionId) update.stripe_subscription_id = subscriptionId;
        await admin.from("profiles").update(update).eq("id", userId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.user_id as string | undefined) ??
          (await findUserIdByCustomer(admin, sub.customer));
        if (!userId) {
          console.error("subscription event without resolvable user", sub.id);
          break;
        }
        const status = isActiveSubscriptionStatus(sub.status);
        const priceId = sub.items.data[0]?.price.id ?? null;
        // Stripe API 2026-04-22 surfaces period end per item.
        const periodEndUnix = sub.items.data[0]?.current_period_end;
        const periodEnd = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null;
        await admin
          .from("profiles")
          .update({
            subscription_status: status,
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            subscription_current_period_end: periodEnd,
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.user_id as string | undefined) ??
          (await findUserIdByCustomer(admin, sub.customer));
        if (!userId) break;
        await admin
          .from("profiles")
          .update({
            subscription_status: "churned",
            stripe_subscription_id: null,
            subscription_current_period_end: null,
          })
          .eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await findUserIdByCustomer(admin, invoice.customer);
        if (!userId) break;
        await admin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", userId);
        break;
      }

      default:
        // Ignore the rest — we don't need them yet.
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error", event.type, err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function findUserIdByCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const customerId =
    typeof customer === "string" ? customer : (customer?.id ?? null);
  if (!customerId) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// Cohort one-time purchase: mark the participant paid, capture
// payment metadata, and set their free-app-access window.
async function handleCohortCheckout(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const participantId = session.metadata?.participant_id as string | undefined;
  const cohortId = session.metadata?.cohort_id as string | undefined;
  if (!participantId || !cohortId) {
    console.error(
      "Cohort checkout missing metadata",
      session.id,
      session.metadata,
    );
    return;
  }

  // Compute free_app_access_until = cohort.end_date + 4 weeks.
  const { data: cohortRow } = await admin
    .from("cohorts")
    .select("end_date")
    .eq("id", cohortId)
    .maybeSingle();
  let freeUntil: string | null = null;
  if (cohortRow) {
    const end = new Date(
      `${(cohortRow as { end_date: string }).end_date}T00:00:00Z`,
    );
    end.setUTCDate(end.getUTCDate() + 28);
    freeUntil = end.toISOString();
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const amountPaid =
    session.amount_total ?? session.amount_subtotal ?? null;

  const { error } = await admin
    .from("cohort_participants")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: amountPaid,
      free_app_access_until: freeUntil,
    })
    .eq("id", participantId);
  if (error) {
    console.error("Cohort participant paid-update failed", error.message);
  }
}
