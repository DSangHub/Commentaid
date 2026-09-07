"use client";
import { createClient } from "@supabase/supabase-js";

// Public, anon-scoped values (safe for the browser; protected by Row-Level Security).
const SUPABASE_URL = "https://kllcufshgjuzeytaerol.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_umB1WmAGBsUnZKDMIv5T4Q_1I1_xk7E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
