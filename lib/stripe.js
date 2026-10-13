import Stripe from "stripe";

let stripeClient;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Missing STRIPE_SECRET_KEY.");

  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2026-08-26.dahlia",
      appInfo: { name: "Commentaid", version: "2.0.0" },
    });
  }

  return stripeClient;
}
