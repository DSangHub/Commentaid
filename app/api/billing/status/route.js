import { getBillingStatus, mexicoPromotion } from "../../../../lib/billing";
import { createAdminSupabase, requireUser } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminSupabase();
    const normal = await getBillingStatus(admin, auth.user.id);
    const promo = await mexicoPromotion(admin, request, auth.user.id, "status");
    const status = promo ? { ...normal, ...promo } : normal;
    return Response.json(status, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Commentaid billing status error", error);
    return Response.json({ error: "Billing status is unavailable." }, { status: 500 });
  }
}
