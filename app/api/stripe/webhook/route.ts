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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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
