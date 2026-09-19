import { decryptSecret, encryptSecret } from "./crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_URL = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";

function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not fully configured.");
  }
  return { clientId, clientSecret, redirectUri };
}

export function youtubeAuthorizationUrl(state, loginHint) {
  const { clientId, redirectUri } = oauthConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

async function tokenRequest(params) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Google token exchange failed.");
  return data;
}

export async function exchangeYouTubeCode(code) {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  return tokenRequest({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export async function refreshYouTubeToken(refreshToken) {
  const { clientId, clientSecret } = oauthConfig();
  return tokenRequest({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" });
}

export async function youtubeApi(path, params, accessToken, init = {}) {
  const url = new URL(`${API_URL}/${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "YouTube request failed.");
  return data;
}

export function encryptedTokenRecord(tokens, priorRefreshToken = null) {
  return {
    access_token_encrypted: encryptSecret(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : priorRefreshToken,
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    scopes: String(tokens.scope || YOUTUBE_SCOPE).split(" ").filter(Boolean),
  };
}

export async function validYouTubeAccessToken(account, admin) {
  const notExpired = account.token_expires_at && new Date(account.token_expires_at).getTime() > Date.now() + 60_000;
  if (notExpired) return decryptSecret(account.access_token_encrypted);
  const refreshToken = decryptSecret(account.refresh_token_encrypted);
  if (!refreshToken) throw new Error("Reconnect YouTube to continue.");
  const tokens = await refreshYouTubeToken(refreshToken);
  const updates = { ...encryptedTokenRecord(tokens, account.refresh_token_encrypted), updated_at: new Date().toISOString() };
  const { error } = await admin.from("connected_accounts").update(updates).eq("id", account.id).eq("user_id", account.user_id);
  if (error) throw error;
  return tokens.access_token;
}
