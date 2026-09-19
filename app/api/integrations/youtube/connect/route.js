import { createOAuthState } from "../../../../../lib/crypto";
import { requireUser } from "../../../../../lib/supabase";
import { youtubeAuthorizationUrl } from "../../../../../lib/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const state = createOAuthState(auth.user.id);
    return Response.json({ url: youtubeAuthorizationUrl(state, auth.user.email) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("YouTube connect error", error);
    return Response.json({ error: error.message || "Could not start YouTube connection." }, { status: 503 });
  }
}
