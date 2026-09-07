export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-side only. The Anthropic key is read from an environment variable and
// is NEVER hardcoded here, so nothing secret is ever committed to the repo.
// Set ANTHROPIC_API_KEY in the Vercel project's Environment Variables.
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = `You are Commentaid, an assistant that drafts replies to social media comments on behalf of a creator or business. Given a comment, respond ONLY with a JSON object (no markdown fences, no prose) with these keys:
- language: the detected language of the comment, named in English (e.g. "Spanish").
- translation: the comment translated to English. If it is already English, repeat it.
- intent: one short label for what the comment is — one of "question", "compliment", "complaint", "sales-opportunity", "spam", or "other".
- options: an array of EXACTLY 3 distinct reply options for the creator to choose from. Each option is an object with:
    - style: a 1-2 word label describing the tone (e.g. "Warm", "Brief", "Playful", "Professional", "Hype").
    - reply: the reply text, written in the COMMENTER'S original language. Make the 3 options genuinely different in tone/approach so the creator has a real choice.
    - reply_english: an English translation of that reply so the creator understands it.
Rules for every reply: keep it short and human, match a creator's natural voice, and NEVER invent facts (prices, links, dates, a Discord that may not exist) — if info is missing, respond helpfully and invite a DM/link without making things up. No hashtags unless the comment had them.`;

function parseModelJson(text) {
  let t = (text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    // Fallback so the UI still shows something usable.
    return {
      language: "",
      translation: "",
      intent: "other",
      options: [{ style: "Draft", reply: t, reply_english: "" }]
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = (body.text || "").toString().slice(0, 2000);
    if (!text.trim()) {
      return Response.json({ error: "No comment text provided." }, { status: 400 });
    }
    if (!ANTHROPIC_KEY) {
      return Response.json({ error: "AI isn't configured yet. Add ANTHROPIC_API_KEY in the Vercel project settings." }, { status: 200 });
    }
    const context = [
      body.videoTitle ? `Video: "${body.videoTitle}"` : null,
      body.author ? `Commenter: ${body.author}` : null,
      `Comment: "${text}"`
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: "user", content: context }]
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || "AI request failed.";
      return Response.json({ error: msg }, { status: 200 });
    }
    const raw = data.content && data.content[0] && data.content[0].text ? data.content[0].text : "";
    const parsed = parseModelJson(raw);
    // Normalize: guarantee an options array.
    if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
      parsed.options = [{ style: "Draft", reply: parsed.reply || "", reply_english: parsed.reply_english || "" }];
    }
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
