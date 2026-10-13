import { getBillingStatus } from "../../../../lib/billing";
import { createAdminSupabase, requireUser } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const status = await getBillingStatus(createAdminSupabase(), auth.user.id);
    return Response.json(status, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Commentaid billing status error", error);
    return Response.json({ error: "Billing status is unavailable." }, { status: 500 });
  }
}
