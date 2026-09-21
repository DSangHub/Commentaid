import { NextResponse } from "next/server";
import { verifyOAuthState } from "../../../../../lib/crypto";
import { youtubeAuthorizationUrl } from "../../../../../lib/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const state = new URL(request.url).searchParams.get("state");
    verifyOAuthState(state);
    return NextResponse.redirect(youtubeAuthorizationUrl(state));
  } catch (error) {
    console.error("YouTube authorize redirect error", error);
    const destination = new URL("/dashboard", request.url);
    destination.searchParams.set("youtube", "error");
    destination.searchParams.set("message", error.message || "Could not open Google authorization.");
    return NextResponse.redirect(destination);
  }
}
