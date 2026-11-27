"use client";
import { useLocale } from "./Locale";

import { useState } from "react";

const tones = ["Warm", "Brief", "Helpful", "Professional", "Sales"];
const replyLanguages = [["original","Same as commenter"],["en","English"],["es","Spanish"],["fr","French"],["pt","Portuguese"],["de","German"],["it","Italian"],["nl","Dutch"],["ar","Arabic"],["hi","Hindi"],["ur","Urdu"],["pa","Punjabi"],["id","Indonesian"],["zh","Chinese"],["ja","Japanese"],["ko","Korean"],["vi","Vietnamese"],["th","Thai"],["tr","Turkish"],["ru","Russian"],["bn","Bengali"],["sw","Swahili"],["tl","Filipino"],["ta","Tamil"],["te","Telugu"]];

export default function ReplyComposer({ getAccessToken, initialComment = "", initialCommentId = "", onUsageChange }) {
  const { lang } = useLocale();
  const t = (en, es) => lang === "es" ? es : en;
  const [comment, setComment] = useState(initialComment);
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("Helpful");
  const [replyLanguage, setReplyLanguage] = useState("original");
  const [result, setResult] = useState(null);
  const [reply, setReply] = useState("");
  const [englishReply, setEnglishReply] = useState("");
  const [draftId, setDraftId] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
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
      setError(t("Paste permission was unavailable. Press and hold in the box to paste.","No hay permiso para pegar. Mantén presionado el campo para pegar."));
    }
  }

  async function generateReply(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    setCopied(false);
    setPosted(false);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment, commentId: initialCommentId, context, tone, replyLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply generation failed.");
      setResult(data);
      setReply(data.options?.[0]?.reply || "");
      setEnglishReply(data.options?.[0]?.replyEnglish || "");
      setDraftId(data.options?.[0]?.draftId || "");
      if (onUsageChange) onUsageChange();
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
      setError(t("Copy permission was unavailable. Select the reply and copy it manually.","No hay permiso para copiar. Selecciona la respuesta y cópiala manualmente."));
    }
  }

  async function approveAndPost() {
    if (!draftId || !initialCommentId) return;
    setPosting(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/integrations/youtube/replies", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ draftId, nativeReply: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post the reply.");
      setPosted(true);
    } catch (postError) {
      setError(postError.message || "Could not post the reply.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="workspaceCard" aria-labelledby="composer-title">
      <div className="cardHeading">
        <div>
          <p className="eyebrow">{t("COPY & PASTE BRIDGE", "COPIA Y PEGA")}</p>
          <h2 id="composer-title">{t("Answer any comment", "Responde a cualquier comentario")}</h2>
        </div>
        <span className="statusDot">{t("Works with any app", "Funciona con cualquier aplicación")}</span>
      </div>

      <form onSubmit={generateReply}>
        <div className="fieldTop">
          <label htmlFor="source-comment">{t("Comment in any language", "Comentario en cualquier idioma")}</label>
          <button className="miniButton" type="button" onClick={pasteComment}>
            Paste from clipboard
          </button>
        </div>
        <textarea
          id="source-comment"
          rows={5}
          maxLength={3000}
          placeholder={t("Copy a comment from YouTube, Instagram, TikTok, Facebook, an ad, or any website, then paste it here…", "Copia un comentario de YouTube, Instagram, TikTok, Facebook, un anuncio o cualquier sitio y pégalo aquí…")}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          required
        />

        <div className="composerGrid">
          <div>
            <label htmlFor="reply-language">{t("Translate reply into", "Traducir la respuesta a")}</label>
            <select id="reply-language" value={replyLanguage} onChange={(event) => setReplyLanguage(event.target.value)}>
              {replyLanguages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tone">{t("Reply tone", "Tono de respuesta")}</label>
            <select id="tone" value={tone} onChange={(event) => setTone(event.target.value)}>
              {tones.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="context">{t("Business context (optional)", "Contexto del negocio (opcional)")}</label>
            <input
              id="context"
              maxLength={500}
              placeholder={t("Product link, hours, policy, or facts AI may use", "Enlace del producto, horarios, políticas o datos para la IA")}
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </div>
        </div>

        <button className="button primary" disabled={busy || !comment.trim()} type="submit">
          {busy ? t("Translating and drafting…", "Traduciendo y preparando respuestas…") : t("Translate and draft reply", "Traducir y preparar respuesta")}
        </button>
      </form>

      {error && <div className="banner error" role="alert">{error}</div>}

      {result && (
        <div className="resultPanel">
          <div className="resultChips">
            <span>Detected: {result.language}</span>
            <span>Reply: {result.replyLanguage || result.language}</span>
            <span>{result.intent}</span>
            {result.risk !== "routine" && <span className="riskChip">Human review: {result.risk}</span>}
          </div>

          <div className="translationBox">
            <strong>{t("English translation", "Traducción al inglés")}</strong>
            <p>{result.translation}</p>
          </div>

          <label>{t("Choose a draft", "Elige un borrador")}</label>
          <div className="replyOptions">
            {result.options.map((option, index) => (
              <button
                className={reply === option.reply ? "replyOption selected" : "replyOption"}
                key={`${option.style}-${index}`}
                type="button"
                onClick={() => {
                  setReply(option.reply);
                  setEnglishReply(option.replyEnglish);
                  setDraftId(option.draftId || "");
                  setCopied(false);
                }}
              >
                <strong>{option.style}</strong>
                <span className="draftEnglish">English: {option.replyEnglish}</span>
                <span className="draftNative">{result.replyLanguage || result.language}: {option.reply}</span>
              </button>
            ))}
          </div>

          <div className="translationBox replyReview" aria-live="polite">
            <strong>{t("Review the reply in English", "Revisa la respuesta en inglés")}</strong>
            <p>{englishReply}</p>
          </div>

          <label htmlFor="final-reply">{t("Edit, then copy the translated reply", "Edita y copia la respuesta traducida")}</label>
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
            {copied ? t("Copied ✓", "Copiado ✓") : t("Copy reply", "Copiar respuesta")}
          </button>
          {initialCommentId && draftId && (
            <button className="button primary postButton" type="button" onClick={approveAndPost} disabled={posting || result.risk !== "routine"}>
              {posting ? t("Posting…", "Publicando…") : posted ? t("Posted to YouTube ✓", "Publicado en YouTube ✓") : result.risk === "routine" ? t("Approve & post to YouTube", "Aprobar y publicar en YouTube") : t("Human review required", "Se requiere revisión humana")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
