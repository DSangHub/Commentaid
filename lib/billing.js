export const BILLING_PLANS = {
  free: { name: "Free", monthlyPrice: 0, interactionLimit: 10 },
  creator: { name: "Creator", monthlyPrice: 2.99, annualPrice: 19.95, interactionLimit: 100 },
  unlimited: { name: "Unlimited", monthlyPrice: 9.95, annualPrice: 99, interactionLimit: null },
  large: { name: "Large Accounts", monthlyPrice: 49.95, interactionLimit: null },
};

const PRICE_ENV = {
  creator: "STRIPE_PRICE_CREATOR",
  unlimited: "STRIPE_PRICE_UNLIMITED",
  large: "STRIPE_PRICE_LARGE",
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function getPriceId(plan, interval = "month") {
  const envName = interval === "year" ? (["creator","unlimited"].includes(plan) ? PRICE_ENV[plan] + "_YEARLY" : null) : PRICE_ENV[plan];
  return envName ? process.env[envName] || "" : "";
}

export function planFromPriceId(priceId) {
  return priceId ? (Object.keys(PRICE_ENV).find((plan) => ["month","year"].some((interval) => getPriceId(plan, interval) === priceId) || process.env[PRICE_ENV[plan] + "_LEGACY"] === priceId) || "free") : "free";
}

export function subscriptionPeriod(subscription) {
  const item = subscription?.items?.data?.[0];
  return {
    start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  };
}

function calendarMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function getBillingStatus(admin, userId) {
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("plan,status,current_period_start,current_period_end,cancel_at_period_end,stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  const paid = subscription && ACTIVE_STATUSES.has(subscription.status);
  const plan = paid && BILLING_PLANS[subscription.plan] ? subscription.plan : "free";
  const periodStart = paid && subscription.current_period_start
    ? new Date(subscription.current_period_start).toISOString().slice(0, 10)
    : calendarMonthStart();
  const { data: usage, error: usageError } = await admin
    .from("ai_usage_months")
    .select("interactions")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (usageError) throw usageError;

  const limit = BILLING_PLANS[plan].interactionLimit;
  const used = usage?.interactions || 0;
  return {
    plan,
    planName: BILLING_PLANS[plan].name,
    status: paid ? subscription.status : "free",
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    currentPeriodEnd: paid ? subscription.current_period_end : null,
    cancelAtPeriodEnd: Boolean(paid && subscription.cancel_at_period_end),
    canManageBilling: Boolean(subscription?.stripe_customer_id),
  };
}

export async function reserveInteraction(admin, userId) {
  const { data, error } = await admin.rpc("reserve_ai_interaction", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function releaseInteraction(admin, userId, periodStart) {
  if (!periodStart) return;
  const { error } = await admin.rpc("release_ai_interaction", {
    p_user_id: userId,
    p_period_start: periodStart,
  });
  if (error) console.error("Could not release Commentaid interaction", error);
}

export async function mexicoPromotion(admin, request, userId, action) {
  if (process.env.VERCEL !== "1" || request.headers.get("x-vercel-ip-country") !== "MX") return null;
  if (Date.now() < Date.parse("2026-11-27T08:00:00Z") || Date.now() >= Date.parse("2026-12-11T08:00:00Z")) return null;
  const { data, error } = await admin.rpc("mexico_promo_access", { p_user_id: userId, p_action: action });
  if (error) {
    if (error.code === "PGRST202") return null;
    throw error;
  }
  return data;
}
export async function releaseReservation(admin, userId, reservation) {
  if (reservation?.promotion === "mexico") {
    const { error } = await admin.rpc("mexico_promo_access", { p_user_id: userId, p_action: "release" });
    if (error) console.error("Could not release promotional interaction", error.code);
  } else {
    await releaseInteraction(admin, userId, reservation?.periodStart);
  }
}
