import { createAdminSupabase, requireUser } from "../../../../../lib/supabase";
import { validYouTubeAccessToken, youtubeApi } from "../../../../../lib/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedAccount(admin, userId, accountId) {
  let query = admin.from("connected_accounts").select("*").eq("user_id", userId).eq("provider", "youtube");
  if (accountId) query = query.eq("id", accountId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminSupabase();
    const accountId = new URL(request.url).searchParams.get("accountId");
    const account = await ownedAccount(admin, auth.user.id, accountId);
    if (!account) return Response.json({ account: null, comments: [] });
    const { data, error } = await admin.from("managed_comments")
      .select("id,external_id,author_name,body,video_id,video_title,published_at,status,metadata")
      .eq("user_id", auth.user.id).eq("connected_account_id", account.id)
      .order("published_at", { ascending: false }).limit(100);
    if (error) throw error;
    return Response.json({
      account: { id: account.id, displayName: account.display_name, mode: account.automation_mode, status: account.status },
      comments: data || [],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error.message || "Could not load managed comments." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const body = await request.json().catch(() => ({}));
    const admin = createAdminSupabase();
    const account = await ownedAccount(admin, auth.user.id, body.accountId);
    if (!account) return Response.json({ error: "Connect a YouTube channel first." }, { status: 404 });
    const accessToken = await validYouTubeAccessToken(account, admin);
    const result = await youtubeApi("commentThreads", {
      part: "snippet", allThreadsRelatedToChannelId: account.provider_account_id,
      maxResults: "100", order: "time", textFormat: "plainText",
    }, accessToken);
    const records = (result.items || []).map((item) => {
      const top = item.snippet?.topLevelComment?.snippet || {};
      const externalId = item.snippet?.topLevelComment?.id || item.id;
      return {
        user_id: auth.user.id,
        connected_account_id: account.id,
        external_id: externalId,
        author_name: top.authorDisplayName || "Viewer",
        body: top.textOriginal || top.textDisplay || "",
        video_id: item.snippet?.videoId || null,
        published_at: top.publishedAt || null,
        metadata: { likeCount: top.likeCount || 0, replyCount: item.snippet?.totalReplyCount || 0 },
        updated_at: new Date().toISOString(),
      };
    }).filter((record) => record.external_id && record.body);
    if (records.length) {
      const { error } = await admin.from("managed_comments").upsert(records, { onConflict: "connected_account_id,external_id", ignoreDuplicates: false });
      if (error) throw error;
    }
    await admin.from("audit_events").insert({ user_id: auth.user.id, connected_account_id: account.id, event_type: "youtube.comments_synced", details: { count: records.length } });
    return Response.json({ synced: records.length });
  } catch (error) {
    console.error("YouTube sync error", error);
    return Response.json({ error: error.message || "Could not sync YouTube comments." }, { status: 500 });
  }
}
