"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import "../globals.css";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    // If already logged in, go straight to the dashboard.
    supabase.auth.getSession().then(({ data }) => {
      if (data && data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined }
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
        } else {
          setNotice("Almost there — check your email and click the confirmation link to activate your account, then come back and sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined }
      });
      if (error) throw error;
      // On success the browser redirects to Google, so nothing else runs here.
    } catch (err) {
      setError(err.message || "Google sign-in isn't available yet.");
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <div className="authCard">
        <div className="authBrand">
          <svg className="authLogo" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6d6ff5"/><stop offset="1" stopColor="#4a3fc4"/></linearGradient></defs>
            <circle cx="400" cy="400" r="400" fill="url(#ag)"/>
            <path d="M 250 210 h 300 a 70 70 0 0 1 70 70 v 150 a 70 70 0 0 1 -70 70 h -170 l -95 82 v -82 h -35 a 70 70 0 0 1 -70 -70 v -150 a 70 70 0 0 1 70 -70 z" fill="#fff"/>
            <circle cx="330" cy="355" r="26" fill="#5b5bd6"/><circle cx="410" cy="355" r="26" fill="#5b5bd6"/><circle cx="490" cy="355" r="26" fill="#5b5bd6"/>
            <path d="M 560 205 c 12 44 18 50 62 62 c -44 12 -50 18 -62 62 c -12 -44 -18 -50 -62 -62 c 44 -12 50 -18 62 -62 z" fill="#ffd36e" stroke="#fff" strokeWidth="6" strokeLinejoin="round"/>
          </svg>
          <span className="authName">Commentaid</span>
        </div>

        <h1 className="authTitle">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="authSub">
          {mode === "signup"
            ? "Start managing your comments with AI."
            : "Sign in to your Commentaid dashboard."}
        </p>

        {error && <div className="authMsg err">{error}</div>}
        {notice && <div className="authMsg ok">{notice}</div>}

        <button type="button" className="googleBtn" onClick={google} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div className="authDivider"><span>or</span></div>

        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />

          <button className="authBtn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="authToggle">
          {mode === "signup" ? (
            <>Already have an account? <button onClick={() => { setMode("signin"); setError(null); setNotice(null); }}>Sign in</button></>
          ) : (
            <>New to Commentaid? <button onClick={() => { setMode("signup"); setError(null); setNotice(null); }}>Create an account</button></>
          )}
        </div>
      </div>
    </main>
  );
}
