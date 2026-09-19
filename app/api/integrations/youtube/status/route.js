import { createAdminSupabase, requireUser } from "../../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminSupabase();
    const { data, error } = await admin.from("connected_accounts")
      .select("id,display_name,provider_account_id,automation_mode,status,metadata,updated_at")
      .eq("user_id", auth.user.id).eq("provider", "youtube").order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ accounts: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error.message || "Could not load connected accounts." }, { status: 503 });
  }
}
