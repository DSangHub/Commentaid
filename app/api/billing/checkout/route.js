import { randomBytes } from "node:crypto";
import { BILLING_PLANS, getPriceId } from "../../../../lib/billing";
import { createAdminSupabase, requireUser } from "../../../../lib/supabase";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const plan = typeof body.plan === "string" ? body.plan : "";
    if (!BILLING_PLANS[plan] || plan === "free") {
      return Response.json({ error: "Choose a paid Commentaid plan." }, { status: 400 });
    }

    const priceId = getPriceId(plan);
    if (!priceId) {
      return Response.json({ error: `${BILLING_PLANS[plan].name} checkout is not configured yet.` }, { status: 503 });
    }

    const admin = createAdminSupabase();
    const { data: billing, error: billingError } = await admin
      .from("subscriptions")
      .select("stripe_customer_id,status")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (billingError) throw billingError;

    if (billing && ["active", "trialing", "past_due"].includes(billing.status)) {
      return Response.json({ error: "Manage your current plan from the billing portal." }, { status: 409 });
    }

    const stripe = getStripe();
    let customerId = billing?.stripe_customer_id || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email || undefined,
        metadata: { commentaid_user_id: auth.user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("subscriptions").upsert({
        user_id: auth.user.id,
        stripe_customer_id: customerId,
        plan: "free",
        status: "free",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: auth.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancelled`,
      integration_identifier: `commentaid_${randomBytes(4).toString("hex")}`,
      metadata: { commentaid_user_id: auth.user.id, commentaid_plan: plan },
      subscription_data: {
        metadata: { commentaid_user_id: auth.user.id, commentaid_plan: plan },
      },
    });

    return Response.json({ url: session.url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Commentaid checkout error", error);
    return Response.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
}
