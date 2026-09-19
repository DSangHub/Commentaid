import { createClient } from "@supabase/supabase-js";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and Supabase publishable key."
    );
  }

  return { url, key };
}

export function createBrowserSupabase() {
  const { url, key } = getConfig();
  return createClient(url, key);
}

export function tryCreateBrowserSupabase() {
  try {
    return createBrowserSupabase();
  } catch {
    return null;
  }
}

export function createAdminSupabase() {
  const { url } = getConfig();
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing Supabase server secret key.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) return { error: "Sign in required.", status: 401 };

  const { url, key } = getConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Your session has expired. Please sign in again.", status: 401 };
  }

  return { user: data.user, token };
}
