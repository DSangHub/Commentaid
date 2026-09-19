import { createAdminSupabase, requireUser } from "../../../../../lib/supabase";
import { validYouTubeAccessToken, youtubeApi } from "../../../../../lib/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let admin;
  let auth;
  let draft;
  try {
    auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { draftId, nativeReply } = await request.json();
    if (!draftId) return Response.json({ error: "Choose a reply draft." }, { status: 400 });
    admin = createAdminSupabase();
    const { data, error } = await admin.from("reply_drafts").select("*").eq("id", draftId).eq("user_id", auth.user.id).single();
    if (error || !data) return Response.json({ error: "Reply draft not found." }, { status: 404 });
    draft = data;
    if (draft.risk !== "routine") {
      return Response.json({ error: "Sensitive or urgent replies require manual posting outside Commentaid." }, { status: 409 });
    }
    if (draft.status === "posted") return Response.json({ error: "This reply was already posted." }, { status: 409 });
    const approvedReply = typeof nativeReply === "string" ? nativeReply.trim() : draft.native_reply;
    if (!approvedReply || approvedReply.length > 3000) {
      return Response.json({ error: "The approved reply must be between 1 and 3,000 characters." }, { status: 400 });
    }
    const { data: comment, error: commentError } = await admin.from("managed_comments").select("*").eq("id", draft.comment_id).eq("user_id", auth.user.id).single();
    if (commentError || !comment) throw commentError || new Error("Comment not found.");
    const { data: account, error: accountError } = await admin.from("connected_accounts").select("*").eq("id", comment.connected_account_id).eq("user_id", auth.user.id).single();
    if (accountError || !account) throw accountError || new Error("Connected account not found.");
    if (account.automation_mode === "paused") return Response.json({ error: "YouTube posting is paused." }, { status: 409 });
    const accessToken = await validYouTubeAccessToken(account, admin);
    const result = await youtubeApi("comments", { part: "snippet" }, accessToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snippet: { parentId: comment.external_id, textOriginal: approvedReply } }),
    });
    const now = new Date().toISOString();
    await Promise.all([
      admin.from("reply_drafts").update({ native_reply: approvedReply, status: "posted", approved_at: now, posted_at: now, updated_at: now }).eq("id", draft.id).eq("user_id", auth.user.id),
      admin.from("managed_comments").update({ status: "posted", updated_at: now }).eq("id", comment.id).eq("user_id", auth.user.id),
      admin.from("reply_publications").insert({ user_id: auth.user.id, draft_id: draft.id, external_reply_id: result.id || null, status: "posted" }),
      admin.from("audit_events").insert({ user_id: auth.user.id, connected_account_id: account.id, event_type: "youtube.reply_posted", details: { draftId: draft.id, commentId: comment.id } }),
    ]);
    return Response.json({ posted: true, externalReplyId: result.id || null });
  } catch (error) {
    console.error("YouTube reply post error", error);
    if (admin && auth?.user && draft?.id) {
      await admin.from("reply_publications").insert({ user_id: auth.user.id, draft_id: draft.id, status: "failed", error_message: String(error.message || "Posting failed").slice(0, 500) });
    }
    return Response.json({ error: error.message || "Could not post the reply." }, { status: 500 });
  }
}
