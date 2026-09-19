import { NextResponse } from "next/server";
import { verifyOAuthState } from "../../../../../lib/crypto";
import { createAdminSupabase } from "../../../../../lib/supabase";
import { encryptedTokenRecord, exchangeYouTubeCode, youtubeApi } from "../../../../../lib/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dashboardRedirect(request, result) {
  const base = process.env.APP_URL || new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/dashboard?youtube=${result}`, base));
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return dashboardRedirect(request, "denied");
  try {
    const { userId } = verifyOAuthState(url.searchParams.get("state"));
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Google did not return an authorization code.");
    const tokens = await exchangeYouTubeCode(code);
    const channelData = await youtubeApi("channels", { part: "snippet,statistics", mine: "true" }, tokens.access_token);
    const channel = channelData.items?.[0];
    if (!channel?.id) throw new Error("No YouTube channel was available for this Google account.");

    const admin = createAdminSupabase();
    const { data: existing } = await admin.from("connected_accounts")
      .select("refresh_token_encrypted")
      .eq("user_id", userId).eq("provider", "youtube").eq("provider_account_id", channel.id)
      .maybeSingle();
    const record = {
      user_id: userId,
      provider: "youtube",
      provider_account_id: channel.id,
      display_name: channel.snippet?.title || "YouTube channel",
      ...encryptedTokenRecord(tokens, existing?.refresh_token_encrypted || null),
      status: "active",
      metadata: {
        thumbnail: channel.snippet?.thumbnails?.default?.url || null,
        subscribers: channel.statistics?.subscriberCount || null,
      },
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from("connected_accounts")
      .upsert(record, { onConflict: "user_id,provider,provider_account_id" })
      .select("id").single();
    if (error) throw error;
    await admin.from("audit_events").insert({ user_id: userId, connected_account_id: data.id, event_type: "youtube.connected" });
    return dashboardRedirect(request, "connected");
  } catch (error) {
    console.error("YouTube callback error", error);
    return dashboardRedirect(request, "error");
  }
}
