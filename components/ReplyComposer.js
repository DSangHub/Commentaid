"use client";

import { useState } from "react";

const tones = ["Warm", "Brief", "Helpful", "Professional", "Sales"];

export default function ReplyComposer({ getAccessToken, initialComment = "" }) {
  const [comment, setComment] = useState(initialComment);
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("Helpful");
  const [result, setResult] = useState(null);
  const [reply, setReply] = useState("");
  const [englishReply, setEnglishReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function pasteComment() {
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      if (!text) throw new Error("Your clipboard is empty.");
      setComment(text);
    } catch {
      setError("Paste permission was unavailable. Press and hold in the box to paste.");
    }
  }

  async function generateReply(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    setCopied(false);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment, context, tone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply generation failed.");
      setResult(data);
      setReply(data.options?.[0]?.reply || "");
      setEnglishReply(data.options?.[0]?.replyEnglish || "");
    } catch (requestError) {
      setError(requestError.message || "Could not reach Commentaid AI.");
    } finally {
      setBusy(false);
    }
  }

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy permission was unavailable. Select the reply and copy it manually.");
    }
  }

  return (
    <section className="workspaceCard" aria-labelledby="composer-title">
      <div className="cardHeading">
        <div>
          <p className="eyebrow">COPY &amp; PASTE BRIDGE</p>
          <h2 id="composer-title">Answer any comment</h2>
        </div>
        <span className="statusDot">Works with any app</span>
      </div>

      <form onSubmit={generateReply}>
        <div className="fieldTop">
          <label htmlFor="source-comment">Comment in any language</label>
          <button className="miniButton" type="button" onClick={pasteComment}>
            Paste from clipboard
          </button>
        </div>
        <textarea
          id="source-comment"
          rows={5}
          maxLength={3000}
          placeholder="Copy a comment from YouTube, Instagram, TikTok, Facebook, an ad, or any website, then paste it here…"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          required
        />

        <div className="composerGrid">
          <div>
            <label htmlFor="tone">Reply tone</label>
            <select id="tone" value={tone} onChange={(event) => setTone(event.target.value)}>
              {tones.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="context">Business context (optional)</label>
            <input
              id="context"
              maxLength={500}
              placeholder="Product link, hours, policy, or facts AI may use"
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </div>
        </div>

        <button className="button primary" disabled={busy || !comment.trim()} type="submit">
          {busy ? "Translating and drafting…" : "Translate and draft reply"}
        </button>
      </form>

      {error && <div className="banner error" role="alert">{error}</div>}

      {result && (
        <div className="resultPanel">
          <div className="resultChips">
            <span>{result.language}</span>
            <span>{result.intent}</span>
            {result.risk !== "routine" && <span className="riskChip">Human review: {result.risk}</span>}
          </div>

          <div className="translationBox">
            <strong>English translation</strong>
            <p>{result.translation}</p>
          </div>

          <label>Choose a draft</label>
          <div className="replyOptions">
            {result.options.map((option, index) => (
              <button
                className={reply === option.reply ? "replyOption selected" : "replyOption"}
                key={`${option.style}-${index}`}
                type="button"
                onClick={() => {
                  setReply(option.reply);
                  setEnglishReply(option.replyEnglish);
                  setCopied(false);
                }}
              >
                <strong>{option.style}</strong>
                <span className="draftEnglish">English: {option.replyEnglish}</span>
                <span className="draftNative">{result.language}: {option.reply}</span>
              </button>
            ))}
          </div>

          <div className="translationBox replyReview" aria-live="polite">
            <strong>Review the reply in English</strong>
            <p>{englishReply}</p>
          </div>

          <label htmlFor="final-reply">Edit, then copy the native-language reply</label>
          <textarea
            id="final-reply"
            rows={4}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
              setCopied(false);
            }}
          />
          <button className="button copyButton" type="button" onClick={copyReply} disabled={!reply}>
            {copied ? "Copied ✓" : "Copy reply"}
          </button>
        </div>
      )}
    </section>
  );
}
