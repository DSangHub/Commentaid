"use client";
import { useLocale } from "./Locale";
import LanguageToggle from "../app/LanguageToggle";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tryCreateBrowserSupabase } from "../lib/supabase";
import ReplyComposer from "./ReplyComposer";

export default function Dashboard() {
  const { lang } = useLocale();
  const t = (en, es) => lang === "es" ? es : en;
  const router = useRouter();
  const [supabase] = useState(() => tryCreateBrowserSupabase());
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(supabase));
  const [channel, setChannel] = useState("");
  const [feed, setFeed] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState(
    supabase ? "" : "Commentaid authentication is not configured."
  );
  const [selectedComment, setSelectedComment] = useState({ text: "", id: "" });
  const [youtubeAccounts, setYoutubeAccounts] = useState([]);
  const [managedFeed, setManagedFeed] = useState(null);
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [integrationMessage, setIntegrationMessage] = useState("");
  const [youtubeAuthorizationUrl, setYoutubeAuthorizationUrl] = useState("");
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("youtube");
    const onboarding = params.get("onboarding");
    const billing = params.get("billing");
    const plan = params.get("plan");

    let notice = "";
    if (result) {
      const message = params.get("message");
      notice = result === "connected"
        ? "YouTube connected successfully."
        : result === "denied"
          ? message || "Google access was not approved."
          : message || "YouTube connection failed. Please try again.";
    } else if (onboarding === "youtube") {
      notice = "Account created. Now connect your YouTube channel and approve access with Google.";
    }

    const timer = window.setTimeout(() => {
      if (notice) setIntegrationMessage(notice);
      if (["creator", "unlimited"].includes(plan)) {
        setPendingPlan(plan);
        setBillingMessage("Your account is ready. Continue to Stripe to activate your selected plan.");
      } else if (billing === "success") {
        setBillingMessage("Payment received. Your plan will update as soon as Stripe confirms the subscription.");
      } else if (billing === "cancelled") {
        setBillingMessage("Checkout was cancelled. Your current plan has not changed.");
      }
    }, 0);
    if (notice || billing || plan) window.history.replaceState({}, "", "/dashboard");
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) router.replace("/login");
      else setUser(data.user);
      setChecking(false);
    });
    return () => { active = false; };
  }, [router, supabase]);

  const getAccessToken = useCallback(async () => {
    if (!supabase) throw new Error("Commentaid authentication is not configured.");
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      router.replace("/login");
      throw new Error("Please sign in again.");
    }
    return data.session.access_token;
  }, [router, supabase]);

  const loadYouTubeStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/integrations/youtube/status", { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check YouTube connection.");
      setYoutubeAccounts(data.accounts || []);
      if (data.accounts?.length) {
        const commentsResponse = await fetch(`/api/integrations/youtube/comments?accountId=${data.accounts[0].id}`, { headers: { authorization: `Bearer ${token}` } });
        const commentsData = await commentsResponse.json();
        if (commentsResponse.ok) setManagedFeed(commentsData);
      }
    } catch (error) {
      setIntegrationMessage(error.message || "Could not check YouTube connection.");
    }
  }, [getAccessToken]);

  const loadBillingStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/billing/status", { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check billing status.");
      setBillingStatus(data);
    } catch (error) {
      setBillingMessage(error.message || "Could not check billing status.");
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => {
      loadYouTubeStatus();
      loadBillingStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadYouTubeStatus, loadBillingStatus]);

  async function startCheckout(plan, interval = "month") {
    setBillingBusy(true);
    setBillingMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (error) {
      setBillingMessage(error.message || "Checkout could not be started.");
      setBillingBusy(false);
    }
  }

  async function manageBilling() {
    setBillingBusy(true);
    setBillingMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/billing/portal", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The billing portal could not be opened.");
      window.location.assign(data.url);
    } catch (error) {
      setBillingMessage(error.message || "The billing portal could not be opened.");
      setBillingBusy(false);
    }
  }

  async function connectYouTube() {
    setIntegrationBusy(true);
    setIntegrationMessage("");
    setYoutubeAuthorizationUrl("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/integrations/youtube/connect", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect YouTube.");
      if (!data.url) throw new Error("Google authorization URL was not returned.");
      setYoutubeAuthorizationUrl(data.url);
      setIntegrationMessage("Google authorization is ready. Continue to Google to approve access.");
    } catch (error) {
      setIntegrationMessage(error.message || "Could not connect YouTube.");
    } finally {
      setIntegrationBusy(false);
    }
  }

  async function syncManagedComments() {
    const account = youtubeAccounts[0];
    if (!account) return;
    setIntegrationBusy(true);
    setIntegrationMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/integrations/youtube/comments", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sync comments.");
      setIntegrationMessage(`${data.synced} comments synced.`);
      await loadYouTubeStatus();
    } catch (error) {
      setIntegrationMessage(error.message || "Could not sync comments.");
    } finally {
      setIntegrationBusy(false);
    }
  }

  async function loadChannel(event) {
    event.preventDefault();
    setLoadingFeed(true);
    setFeedError("");
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/comments?channel=${encodeURIComponent(channel)}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load comments.");
      setFeed(data);
    } catch (error) {
      setFeedError(error.message || "Could not load comments.");
    } finally {
      setLoadingFeed(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) return <main className="loadingPage">{t("Loading your dashboard…", "Cargando tu panel…")}</main>;

  return (
    <main className="dashboardShell">
      <nav className="dashboardNav">
        <Link className="brand" href="/">Commentaid</Link>
        <div className="userBar"><LanguageToggle />
          <span>{user?.email}</span>
          <button className="miniButton" type="button" onClick={signOut}>{t("Sign out", "Cerrar sesión")}</button>
        </div>
      </nav>

      <header className="dashboardHead">
        <p className="eyebrow">{t("COMMENT COMMAND CENTER", "CENTRO DE COMENTARIOS")}</p>
        <h1>{t("Translate. Respond. Grow.", "Traduce. Responde. Crece.")}</h1>
        <p>{t("Manage multilingual comments from any post or ad through one AI bridge.", "Gestiona comentarios multilingües de cualquier publicación o anuncio con IA.")}</p>
      </header>

      <ReplyComposer key={selectedComment.id || selectedComment.text || "manual"} getAccessToken={getAccessToken} initialComment={selectedComment.text} initialCommentId={selectedComment.id} onUsageChange={loadBillingStatus} />

      <section className="workspaceCard billingCard" aria-labelledby="billing-title">
        <div className="cardHeading">
          <div>
            <p className="eyebrow">{t("PLAN & USAGE", "PLAN Y USO")}</p>
            <h2 id="billing-title">{billingStatus?.planName || "Loading plan…"}</h2>
          </div>
          {billingStatus && <span className="statusDot">{billingStatus.status}</span>}
        </div>
        {billingStatus && (
          <div className="billingSummary">
            <div>
              <strong>{billingStatus.limit === null ? t("Unlimited AI interactions", "Interacciones con IA ilimitadas") : `${billingStatus.used} of ${billingStatus.limit} AI interactions used`}</strong>
              <p>{billingStatus.remaining === null ? t("No monthly interaction cap.", "Sin límite mensual de interacciones.") : `${billingStatus.remaining} remaining in this period.`}</p>
            </div>
            {billingStatus.canManageBilling && billingStatus.plan !== "free" ? (
              <button className="button secondary" type="button" onClick={manageBilling} disabled={billingBusy}>{t("Manage billing", "Gestionar pagos")}</button>
            ) : (
              <div className="billingActions">
                <button className="miniButton accent" type="button" onClick={() => startCheckout("creator")} disabled={billingBusy}>{t("Creator $2.99/mo", "Creador $2.99/mes")}</button>
                <button className="miniButton accent" type="button" onClick={() => startCheckout("unlimited")} disabled={billingBusy}>{t("Unlimited $9.95/mo", "Ilimitado $9.95/mes")}</button>
                <button className="miniButton accent" type="button" onClick={() => startCheckout("creator", "year")} disabled={billingBusy}>{t("Creator $19.95/year", "Creador $19.95/año")}</button>
                <button className="miniButton accent" type="button" onClick={() => startCheckout("unlimited", "year")} disabled={billingBusy}>{t("Unlimited $99/year", "Ilimitado $99/año")}</button>
              </div>
            )}
          </div>
        )}
        {pendingPlan && billingStatus?.plan === "free" && (
          <button className="button primary billingContinue" type="button" onClick={() => startCheckout(pendingPlan)} disabled={billingBusy}>
            {billingBusy ? t("Opening secure checkout…", "Abriendo pago seguro…") : t("Continue to secure checkout", "Continuar al pago seguro")}
          </button>
        )}
        {billingMessage && <div className="banner" role="status">{billingMessage}</div>}
      </section>

      <section className="workspaceCard integrationCard" aria-labelledby="youtube-connect-title">
        <div className="cardHeading">
          <div>
            <p className="eyebrow">{t("MANAGED ACCOUNTS", "CUENTAS GESTIONADAS")}</p>
            <h2 id="youtube-connect-title">{t("YouTube connection", "Conexión con YouTube")}</h2>
          </div>
          <span className="statusDot">{youtubeAccounts.length ? t("Connected", "Conectado") : t("Not connected", "Sin conectar")}</span>
        </div>
        {youtubeAccounts.length ? (
          <div className="integrationRow">
            <div><strong>{youtubeAccounts[0].display_name}</strong><p>{t("Connected · Replies post only after approval", "Conectado · Las respuestas se publican solo tras tu aprobación")}</p></div>
            <button className="button primary" type="button" onClick={syncManagedComments} disabled={integrationBusy}>{integrationBusy ? t("Syncing…", "Sincronizando…") : t("Sync comments", "Sincronizar comentarios")}</button>
          </div>
        ) : (
          <div className="integrationRow">
            <p>{t("Authorize Commentaid to read comments and post only the replies you approve.", "Autoriza a Commentaid a leer comentarios y publicar solo las respuestas que apruebes.")}</p>
            {youtubeAuthorizationUrl ? (
              <a className="button primary" href={youtubeAuthorizationUrl}>{t("Continue to Google", "Continuar con Google")}</a>
            ) : (
              <button className="button primary" type="button" onClick={connectYouTube} disabled={integrationBusy}>{integrationBusy ? t("Preparing Google…", "Preparando Google…") : t("Connect YouTube", "Conectar YouTube")}</button>
            )}
          </div>
        )}
        {integrationMessage && <div className="banner" role="status">{integrationMessage}</div>}
      </section>


      {managedFeed?.comments?.length > 0 && (
        <section className="workspaceCard" aria-labelledby="managed-comments-title">
          <div className="cardHeading"><div><p className="eyebrow">{t("APPROVAL QUEUE", "RESPUESTAS PENDIENTES")}</p><h2 id="managed-comments-title">{t("Connected-channel comments", "Comentarios del canal conectado")}</h2></div></div>
          <div className="commentList">
            {managedFeed.comments.map((comment) => (
              <article className="commentCard" key={comment.id}>
                <div className="commentMeta"><strong>{comment.author_name}</strong><span>{comment.status}</span></div>
                <p>{comment.body}</p>
                <button className="miniButton accent" type="button" onClick={() => { setSelectedComment({ text: comment.body, id: comment.id }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("Draft managed reply", "Preparar respuesta")}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="workspaceCard" aria-labelledby="monitor-title">
        <div className="cardHeading">
          <div>
            <p className="eyebrow">{t("YOUTUBE MONITOR", "MONITOR DE YOUTUBE")}</p>
            <h2 id="monitor-title">{t("Recent channel comments", "Comentarios recientes del canal")}</h2>
          </div>
        </div>

        <form className="channelForm" onSubmit={loadChannel}>
          <input
            aria-label={t("YouTube channel", "Canal de YouTube")}
            placeholder={t("@handle, channel ID, or YouTube channel URL", "@usuario, ID o URL del canal de YouTube")}
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            required
          />
          <button className="button primary" disabled={loadingFeed} type="submit">
            {loadingFeed ? t("Loading…", "Cargando…") : t("Load comments", "Cargar comentarios")}
          </button>
        </form>

        {feedError && <div className="banner error" role="alert">{feedError}</div>}
        {feed?.channel && (
          <div className="channelSummary">
            <strong>{feed.channel.title}</strong>
            <span>{feed.comments.length} recent comments</span>
          </div>
        )}
        {feed && feed.comments.length === 0 && (
          <div className="emptyState">{t("No recent comments were found for this channel.", "No se encontraron comentarios recientes en este canal.")}</div>
        )}
        <div className="commentList">
          {feed?.comments.map((comment) => (
            <article className="commentCard" key={comment.id}>
              <div className="commentMeta">
                <strong>{comment.author}</strong>
                <span>{comment.videoTitle}</span>
              </div>
              <p>{comment.text}</p>
              <div className="commentActions">
                <button
                  className="miniButton accent"
                  type="button"
                  onClick={() => {
                    setSelectedComment({ text: comment.text, id: "" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Draft reply
                </button>
                <a href={comment.url} target="_blank" rel="noreferrer">{t("View on YouTube", "Ver en YouTube")}</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
