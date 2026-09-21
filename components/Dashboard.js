"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tryCreateBrowserSupabase } from "../lib/supabase";
import ReplyComposer from "./ReplyComposer";

export default function Dashboard() {
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

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => loadYouTubeStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [user, loadYouTubeStatus]);

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

  if (checking) return <main className="loadingPage">Loading your dashboard…</main>;

  return (
    <main className="dashboardShell">
      <nav className="dashboardNav">
        <Link className="brand" href="/">Commentaid</Link>
        <div className="userBar">
          <span>{user?.email}</span>
          <button className="miniButton" type="button" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <header className="dashboardHead">
        <p className="eyebrow">COMMENT COMMAND CENTER</p>
        <h1>Translate. Respond. Grow.</h1>
        <p>Manage multilingual comments from any post or ad through one AI bridge.</p>
      </header>

      <section className="workspaceCard integrationCard" aria-labelledby="youtube-connect-title">
        <div className="cardHeading">
          <div>
            <p className="eyebrow">MANAGED ACCOUNTS</p>
            <h2 id="youtube-connect-title">YouTube connection</h2>
          </div>
          <span className="statusDot">Approval required</span>
        </div>
        {youtubeAccounts.length ? (
          <div className="integrationRow">
            <div><strong>{youtubeAccounts[0].display_name}</strong><p>Connected · Replies post only after approval</p></div>
            <button className="button primary" type="button" onClick={syncManagedComments} disabled={integrationBusy}>{integrationBusy ? "Syncing…" : "Sync comments"}</button>
          </div>
        ) : (
          <div className="integrationRow">
            <p>Authorize Commentaid to read comments and post only the replies you approve.</p>
            {youtubeAuthorizationUrl ? (
              <a className="button primary" href={youtubeAuthorizationUrl}>Continue to Google</a>
            ) : (
              <button className="button primary" type="button" onClick={connectYouTube} disabled={integrationBusy}>{integrationBusy ? "Preparing Google…" : "Connect YouTube"}</button>
            )}
          </div>
        )}
        {integrationMessage && <div className="banner" role="status">{integrationMessage}</div>}
      </section>

      <ReplyComposer key={selectedComment.id || selectedComment.text || "manual"} getAccessToken={getAccessToken} initialComment={selectedComment.text} initialCommentId={selectedComment.id} />

      {managedFeed?.comments?.length > 0 && (
        <section className="workspaceCard" aria-labelledby="managed-comments-title">
          <div className="cardHeading"><div><p className="eyebrow">APPROVAL QUEUE</p><h2 id="managed-comments-title">Connected-channel comments</h2></div></div>
          <div className="commentList">
            {managedFeed.comments.map((comment) => (
              <article className="commentCard" key={comment.id}>
                <div className="commentMeta"><strong>{comment.author_name}</strong><span>{comment.status}</span></div>
                <p>{comment.body}</p>
                <button className="miniButton accent" type="button" onClick={() => { setSelectedComment({ text: comment.body, id: comment.id }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Draft managed reply</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="workspaceCard" aria-labelledby="monitor-title">
        <div className="cardHeading">
          <div>
            <p className="eyebrow">YOUTUBE MONITOR</p>
            <h2 id="monitor-title">Recent channel comments</h2>
          </div>
        </div>

        <form className="channelForm" onSubmit={loadChannel}>
          <input
            aria-label="YouTube channel"
            placeholder="@handle, channel ID, or YouTube channel URL"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            required
          />
          <button className="button primary" disabled={loadingFeed} type="submit">
            {loadingFeed ? "Loading…" : "Load comments"}
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
          <div className="emptyState">No recent comments were found for this channel.</div>
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
                <a href={comment.url} target="_blank" rel="noreferrer">View on YouTube</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
