import { createOAuthState } from "../../../../../lib/crypto";
import { requireUser } from "../../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const state = createOAuthState(auth.user.id);
    const authorizeUrl = new URL("/api/integrations/youtube/authorize", request.url);
    authorizeUrl.searchParams.set("state", state);
    return Response.json({ url: authorizeUrl.toString() }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("YouTube connect error", error);
    return Response.json({ error: error.message || "Could not start YouTube connection." }, { status: 503 });
  }
}
