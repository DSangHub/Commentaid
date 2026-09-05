"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "../lib/supabase";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabase();
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        router.replace("/dashboard");
      }
    } catch (error) {
      setMessage(error.message || "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <section className="authCard" aria-labelledby="auth-title">
        <Link className="authBrand" href="/">Commentaid</Link>
        <p className="eyebrow">AI COMMENT BRIDGE</p>
        <h1 id="auth-title" className="authTitle">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="authSub">
          {mode === "signin"
            ? "Sign in to manage comments and multilingual replies."
            : "Start turning comments into conversations."}
        </p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            placeholder="At least 6 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && <div className="formMessage" role="status">{message}</div>}

          <button className="button primary wide" disabled={busy} type="submit">
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          className="textButton"
          type="button"
          onClick={() => {
            setMessage("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin"
            ? "New to Commentaid? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
