import { createAdminSupabase, requireUser } from "../../../../lib/supabase";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return Response.json({ error: "No paid billing account was found." }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return Response.json({ url: session.url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Commentaid billing portal error", error);
    return Response.json({ error: "The billing portal could not be opened." }, { status: 500 });
  }
}
