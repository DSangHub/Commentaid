import { planFromPriceId, subscriptionPeriod } from "../../../../lib/billing";
import { createAdminSupabase } from "../../../../lib/supabase";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resourceId(value) {
  return typeof value === "string" ? value : value?.id || "";
}

async function syncSubscription(admin, stripeSubscription) {
  const customerId = resourceId(stripeSubscription.customer);
  const subscriptionId = stripeSubscription.id;
  const item = stripeSubscription.items?.data?.[0];
  const priceId = resourceId(item?.price);
  const period = subscriptionPeriod(stripeSubscription);

  let { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const fallbackUserId = stripeSubscription.metadata?.commentaid_user_id || "";
  if (!existing?.user_id && fallbackUserId) {
    const { data, error } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", fallbackUserId)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }
  if (!existing?.user_id) throw new Error(`No Commentaid user for Stripe customer ${customerId}.`);

  const { error } = await admin.from("subscriptions").upsert({
    user_id: existing.user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId || null,
    plan: planFromPriceId(priceId),
    status: stripeSubscription.status,
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

async function subscriptionFromInvoice(stripe, invoice) {
  const subscriptionId = resourceId(
    invoice.parent?.subscription_details?.subscription || invoice.subscription
  );
  return subscriptionId ? stripe.subscriptions.retrieve(subscriptionId) : null;
}

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    return Response.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: recorded, error: recordError } = await admin
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle();
  if (recordError) throw recordError;
  if (recorded?.processed_at) return Response.json({ received: true, duplicate: true });

  await admin.from("stripe_webhook_events").upsert({
    id: event.id,
    event_type: event.type,
    last_error: null,
  }, { onConflict: "id" });

  try {
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"].includes(event.type)) {
      await syncSubscription(admin, event.data.object);
    } else if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const subscriptionId = resourceId(event.data.object.subscription);
      if (subscriptionId) await syncSubscription(admin, await stripe.subscriptions.retrieve(subscriptionId));
    } else if (["invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed"].includes(event.type)) {
      const subscription = await subscriptionFromInvoice(stripe, event.data.object);
      if (subscription) await syncSubscription(admin, subscription);
    }

    const { error } = await admin.from("stripe_webhook_events").update({
      processed_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", event.id);
    if (error) throw error;
    return Response.json({ received: true });
  } catch (error) {
    console.error("Commentaid Stripe webhook error", event.type, error);
    await admin.from("stripe_webhook_events").update({
      last_error: error?.message || "Webhook processing failed.",
    }).eq("id", event.id);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
