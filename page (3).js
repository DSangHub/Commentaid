"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import "../globals.css";

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const secs = Math.floor((Date.now() - then) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, s] of units) {
    const v = Math.floor(secs / s);
    if (v >= 1) return `${v} ${name}${v > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function langTag(text) {
  if (/[一-鿿]/.test(text)) return { label: "CJK", color: "#b45309" };
  if (/[぀-ヿ]/.test(text)) return { label: "Japanese", color: "#be185d" };
  if (/[가-힯]/.test(text)) return { label: "Korean", color: "#7c3aed" };
  if (/[؀-ۿ]/.test(text)) return { label: "Arabic", color: "#0f766e" };
  if (/[Ѐ-ӿ]/.test(text)) return { label: "Cyrillic", color: "#1d4ed8" };
  if (/[ऀ-ॿ]/.test(text)) return { label: "Devanagari", color: "#c2410c" };
  if (/[áéíóúñ¿¡]/i.test(text)) return { label: "Spanish?", color: "#5b5bd6" };
  return { label: "Latin", color: "#6b7280" };
}

function initials(name) {
  return (name || "?").replace(/^@/, "").slice(0, 2).toUpperCase();
}

const INTENT_COLORS = {
  question: "#1d4ed8", compliment: "#059669", complaint: "#b91c1c",
  "sales-opportunity": "#7c3aed", spam: "#6b7280", other: "#6b7280"
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});

  // "Try it" box state (independent of any channel)
  const [tryText, setTryText] = useState("");
  const [tryDraft, setTryDraft] = useState(null); // { loading, error, data, sel, edit, copied }

  // Auth gate
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data || !data.session) { router.replace("/login"); return; }
      setUser(data.session.user);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
      else setUser(session.user);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [router]);

  const load = useCallback(async (channel) => {
    setLoading(true); setError(null); setDrafts({});
    try {
      const url = channel ? `/api/comments?channel=${encodeURIComponent(channel)}` : "/api/comments";
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) setError(json.error);
      setData(json);
    } catch (e) {
      setError("Couldn't reach the server. Try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authChecked) load(); }, [authChecked, load]);

  const draftReply = useCallback(async (c) => {
    setDrafts((d) => ({ ...d, [c.id]: { ...(d[c.id] || {}), loading: true, error: null } }));
    try {
      const res = await fetch("/api/reply", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: c.text, videoTitle: c.videoTitle, author: c.author })
      });
      const json = await res.json();
      if (json.error) {
        setDrafts((d) => ({ ...d, [c.id]: { loading: false, error: json.error } }));
      } else {
        const opts = json.options || [];
        setDrafts((d) => ({ ...d, [c.id]: { loading: false, data: json, sel: 0, edit: (opts[0] && opts[0].reply) || "", copied: false } }));
      }
    } catch (e) {
      setDrafts((d) => ({ ...d, [c.id]: { loading: false, error: "Couldn't reach the AI." } }));
    }
  }, []);

  const selectOption = (id, idx) =>
    setDrafts((d) => {
      const cur = d[id];
      if (!cur || !cur.data) return d;
      const opt = cur.data.options[idx];
      return { ...d, [id]: { ...cur, sel: idx, edit: (opt && opt.reply) || "", copied: false } };
    });

  const setEdit = (id, val) => setDrafts((d) => ({ ...d, [id]: { ...d[id], edit: val, copied: false } }));

  const copyDraft = (id) => {
    const d = drafts[id];
    if (!d || !d.edit) return;
    try {
      navigator.clipboard.writeText(d.edit);
      setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], copied: true } }));
      setTimeout(() => setDrafts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], copied: false } } : prev)), 1500);
    } catch {}
  };

  // ---- "Try it" handlers ----
  const draftTry = useCallback(async () => {
    const text = tryText.trim();
    if (!text) return;
    setTryDraft({ loading: true, error: null });
    try {
      const res = await fetch("/api/reply", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      const json = await res.json();
      if (json.error) {
        setTryDraft({ loading: false, error: json.error });
      } else {
        const opts = json.options || [];
        setTryDraft({ loading: false, data: json, sel: 0, edit: (opts[0] && opts[0].reply) || "", copied: false });
      }
    } catch (e) {
      setTryDraft({ loading: false, error: "Couldn't reach the AI. Try again." });
    }
  }, [tryText]);

  const selectTryOption = (idx) =>
    setTryDraft((d) => {
      if (!d || !d.data) return d;
      const opt = d.data.options[idx];
      return { ...d, sel: idx, edit: (opt && opt.reply) || "", copied: false };
    });

  const setTryEdit = (val) => setTryDraft((d) => (d ? { ...d, edit: val, copied: false } : d));

  const copyTry = () => {
    setTryDraft((d) => {
      if (!d || !d.edit) return d;
      try { navigator.clipboard.writeText(d.edit); } catch {}
      return { ...d, copied: true };
    });
    setTimeout(() => setTryDraft((d) => (d ? { ...d, copied: false } : d)), 1500);
  };

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!authChecked) {
    return <main className="authWrap"><div className="empty" style={{ maxWidth: 340 }}>Loading your dashboard…</div></main>;
  }

  const comments = (data && data.comments) || [];
  const channel = (data && data.channel) || null;
  const uniqueAuthors = new Set(comments.map((c) => c.author)).size;
  const videosWithComments = new Set(comments.map((c) => c.videoId)).size;

  const trySel = tryDraft && tryDraft.data ? (tryDraft.sel || 0) : 0;
  const trySelOpt = tryDraft && tryDraft.data && tryDraft.data.options ? tryDraft.data.options[trySel] : null;

  return (
    <main>
      <nav className="nav">
        <div className="brand">Commentaid</div>
        <div className="userbar">
          <span className="pill">Comment Monitor</span>
          {user && <span className="useremail">{user.email}</span>}
          <button className="signout" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <div className="wrap">
        <header className="head">
          <h1>Live comment monitor</h1>
          <p className="sub">
            Reading comments across a channel’s videos, with 3 AI-drafted reply options in the
            commenter’s own language. Type any channel (handle, ID, or URL) to switch.
          </p>
          <form className="switcher" onSubmit={(e) => { e.preventDefault(); load(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. @comment-aid or a channel URL" aria-label="Channel" />
            <button type="submit">Load</button>
            <button type="button" className="ghost" onClick={() => load(channel && channel.id)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </form>
        </header>

        {/* ---- Try it box ---- */}
        <section className="tryCard">
          <div className="tryHead">
            <span className="tryBadge">✦ Try it</span>
            <span className="trySub">Paste any comment — in any language — and see the instant translation and 3 reply options. No channel or videos needed.</span>
          </div>
          <textarea
            className="tryInput"
            value={tryText}
            onChange={(e) => setTryText(e.target.value)}
            rows={3}
            placeholder="e.g. ¡Me encanta este video! ¿Cuándo sale el próximo?"
          />
          <div className="tryActions">
            <button className="tryBtn" onClick={draftTry} disabled={(tryDraft && tryDraft.loading) || !tryText.trim()}>
              {tryDraft && tryDraft.loading ? "Drafting…" : "✦ Draft 3 replies"}
            </button>
            {tryText && (
              <button className="tryClear" type="button" onClick={() => { setTryText(""); setTryDraft(null); }}>Clear</button>
            )}
          </div>

          {tryDraft && tryDraft.error && <div className="draft err">{tryDraft.error}</div>}

          {tryDraft && tryDraft.data && (
            <div className="draft">
              <div className="draftTags">
                {tryDraft.data.language && <span className="chip">{tryDraft.data.language}</span>}
                {tryDraft.data.intent && (
                  <span className="chip" style={{ background: (INTENT_COLORS[tryDraft.data.intent] || "#6b7280") + "22", color: INTENT_COLORS[tryDraft.data.intent] || "#6b7280" }}>{tryDraft.data.intent}</span>
                )}
              </div>
              {tryDraft.data.translation && <div className="draftLine"><span className="draftLabel">They said (EN):</span> {tryDraft.data.translation}</div>}

              <div className="draftLabel" style={{ marginTop: 10 }}>Choose a reply — tap one, then edit:</div>
              <div className="options">
                {tryDraft.data.options.map((o, i) => (
                  <button key={i} className={"optCard" + (i === trySel ? " sel" : "")} onClick={() => selectTryOption(i)} type="button">
                    <span className="optStyle">{o.style || `Option ${i + 1}`}</span>
                    <span className="optText">{o.reply}</span>
                  </button>
                ))}
              </div>

              <textarea className="draftText" value={tryDraft.edit} onChange={(e) => setTryEdit(e.target.value)} rows={3} />
              {trySelOpt && trySelOpt.reply_english && <div className="draftLine muted"><span className="draftLabel">In English:</span> {trySelOpt.reply_english}</div>}
              <div className="draftActions">
                <button className="copyBtn" onClick={copyTry}>{tryDraft.copied ? "Copied ✓" : "Copy reply"}</button>
                <span className="draftNote">This is a live demo of the AI. On a real comment, you’ll be able to post the reply straight to YouTube.</span>
              </div>
            </div>
          )}
        </section>

        {channel && (
          <div className="channelBar">
            {channel.thumb ? <img src={channel.thumb} alt="" className="chThumb" /> : <div className="chThumb ph">{initials(channel.title)}</div>}
            <div>
              <div className="chTitle">{channel.title}</div>
              <div className="chMeta">
                {channel.subscribers != null && <span>{Number(channel.subscribers).toLocaleString()} subscribers</span>}
                {channel.videos != null && <span>{Number(channel.videos).toLocaleString()} videos</span>}
              </div>
            </div>
          </div>
        )}

        <section className="stats">
          <div className="stat"><div className="num">{comments.length}</div><div className="lbl">Comments</div></div>
          <div className="stat"><div className="num">{uniqueAuthors}</div><div className="lbl">People</div></div>
          <div className="stat"><div className="num">{videosWithComments}</div><div className="lbl">Videos w/ comments</div></div>
        </section>

        {error && <div className="banner err">{error}</div>}
        {data && data.notice && !error && <div className="banner">{data.notice}</div>}
        {loading && !data && <div className="empty">Loading comments…</div>}
        {!loading && comments.length === 0 && !error && (
          <div className="empty">No comments to show for this channel yet. When it has videos with comments, they’ll appear here automatically. In the meantime, try the box above with any comment.</div>
        )}

        <ul className="feed">
          {comments.map((c) => {
            const tag = langTag(c.text);
            const d = drafts[c.id];
            const sel = d && d.data ? (d.sel || 0) : 0;
            const selOpt = d && d.data && d.data.options ? d.data.options[sel] : null;
            return (
              <li key={c.id} className="card">
                <div className="avatar">{c.authorImage ? <img src={c.authorImage} alt="" /> : <span>{initials(c.author)}</span>}</div>
                <div className="body">
                  <div className="row1">
                    <span className="author">{c.author}</span>
                    <span className="dot">·</span>
                    <span className="when">{timeAgo(c.publishedAt)}</span>
                    <span className="langtag" style={{ color: tag.color, borderColor: tag.color }}>{tag.label}</span>
                  </div>
                  <p className="text">{c.text}</p>
                  <div className="row2">
                    <a className="video" href={`https://www.youtube.com/watch?v=${c.videoId}&lc=${c.id}`} target="_blank" rel="noreferrer">▶ {c.videoTitle}</a>
                    {c.likeCount > 0 && <span className="meta">♥ {c.likeCount}</span>}
                    {c.replyCount > 0 && <span className="meta">↩ {c.replyCount} {c.replyCount === 1 ? "reply" : "replies"}</span>}
                    <button className="draftBtn" onClick={() => draftReply(c)} disabled={d && d.loading}>
                      {d && d.loading ? "Drafting…" : d && d.data ? "✦ Redraft" : "✦ Draft reply"}
                    </button>
                  </div>

                  {d && d.error && <div className="draft err">{d.error}</div>}

                  {d && d.data && (
                    <div className="draft">
                      <div className="draftTags">
                        {d.data.language && <span className="chip">{d.data.language}</span>}
                        {d.data.intent && (
                          <span className="chip" style={{ background: (INTENT_COLORS[d.data.intent] || "#6b7280") + "22", color: INTENT_COLORS[d.data.intent] || "#6b7280" }}>{d.data.intent}</span>
                        )}
                      </div>
                      {d.data.translation && <div className="draftLine"><span className="draftLabel">They said (EN):</span> {d.data.translation}</div>}

                      <div className="draftLabel" style={{ marginTop: 10 }}>Choose a reply — tap one, then edit:</div>
                      <div className="options">
                        {d.data.options.map((o, i) => (
                          <button key={i} className={"optCard" + (i === sel ? " sel" : "")} onClick={() => selectOption(c.id, i)} type="button">
                            <span className="optStyle">{o.style || `Option ${i + 1}`}</span>
                            <span className="optText">{o.reply}</span>
                          </button>
                        ))}
                      </div>

                      <textarea className="draftText" value={d.edit} onChange={(e) => setEdit(c.id, e.target.value)} rows={3} />
                      {selOpt && selOpt.reply_english && <div className="draftLine muted"><span className="draftLabel">In English:</span> {selOpt.reply_english}</div>}
                      <div className="draftActions">
                        <button className="copyBtn" onClick={() => copyDraft(c.id)}>{d.copied ? "Copied ✓" : "Copy reply"}</button>
                        <span className="draftNote">Posting to YouTube comes next — for now, copy &amp; paste your reply.</span>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="foot">
          {data && data.fetchedAt && <span>Updated {timeAgo(data.fetchedAt)}</span>}
          <span>Commentaid · signed in</span>
        </footer>
      </div>
    </main>
  );
}
