"use client";
import { useLocale } from "./Locale";
import LanguageToggle from "../app/LanguageToggle";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "../lib/supabase";

export default function AuthForm({ initialMode = "signin", nextPath = "/dashboard" }) {
  const { lang } = useLocale();
  const t = (en, es) => lang === "es" ? es : en;
  const router = useRouter();
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const destination =
    typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

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
        setMessage(t("Check your email to confirm your account, then return here and sign in to connect your channel.","Revisa tu correo para confirmar tu cuenta. Después, vuelve e inicia sesión."));
        setMode("signin");
      } else {
        router.replace(destination);
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
        <LanguageToggle />
        <Link className="authBrand" href="/">Commentaid</Link>
        <p className="eyebrow">{t("AI COMMENT BRIDGE", "PUENTE DE COMENTARIOS CON IA")}</p>
        <h1 id="auth-title" className="authTitle">
          {mode === "signin" ? t("Welcome back", "Bienvenido de nuevo") : t("Create your account", "Crea tu cuenta")}
        </h1>
        <p className="authSub">
          {mode === "signin"
            ? t("Sign in to manage comments and multilingual replies.", "Inicia sesión para gestionar comentarios y respuestas multilingües.")
            : t("Create an account to let Commentaid help manage your comments. Next, connect your YouTube channel and authorize access through Google. Review AI replies in English and approve them before posting.", "Crea tu cuenta y empieza a traducir comentarios. Conectar YouTube es opcional. Revisa y aprueba las respuestas antes de publicarlas.")}
        </p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label htmlFor="email">{t("Email", "Correo electrónico")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">{t("Password", "Contraseña")}</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            placeholder={t("At least 6 characters", "Al menos 6 caracteres")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && <div className="formMessage" role="status">{message}</div>}

          <button className="button primary wide" disabled={busy} type="submit">
            {busy
              ? t("Please wait…", "Espera un momento…")
              : mode === "signin"
                ? t("Sign in", "Iniciar sesión")
                : t("Create account & continue", "Crear cuenta y continuar")}
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
            ? t("New to Commentaid? Create an account", "¿Nuevo en Commentaid? Crea una cuenta")
            : t("Already have an account? Sign in", "¿Ya tienes cuenta? Inicia sesión")}
        </button>
      </section>
    </main>
  );
}
