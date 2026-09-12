import { Output, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { requireUser } from "../../../lib/supabase";
import { checkRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const replySchema = z.object({
  language: z.string().min(1),
  translation: z.string().min(1),
  intent: z.enum([
    "question",
    "compliment",
    "complaint",
    "purchase interest",
    "spam or abuse",
    "other",
  ]),
  risk: z.enum(["routine", "sensitive", "urgent"]),
  options: z.array(
    z.object({
      style: z.string().min(1),
      reply: z.string().min(1),
      replyEnglish: z.string().min(1),
    })
  ).length(3),
});

function getModel() {
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(process.env.OPENAI_MODEL || "gpt-5.4-mini");
  }

  return process.env.AI_MODEL || "openai/gpt-5.4-mini";
}

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const rate = checkRateLimit(`reply:${auth.user.id}`, 30);
    if (!rate.allowed) {
      return Response.json(
        { error: "Hourly AI reply limit reached. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
      );
    }

    const body = await request.json();
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    const tone = typeof body.tone === "string" ? body.tone.trim() : "Helpful";

    if (!comment || comment.length > 3000) {
      return Response.json(
        { error: "Enter a comment between 1 and 3,000 characters." },
        { status: 400 }
      );
    }

    const { output } = await generateText({
      model: getModel(),
      output: Output.object({ schema: replySchema }),
      system: `You are Commentaid, a multilingual comment-response assistant for creators and businesses.
Detect the comment's language and translate it naturally into English.
Draft exactly three useful replies in the commenter's original language, with an English rendering of each.
Keep replies concise, culturally respectful, and faithful to the requested tone.
Never invent prices, availability, policies, links, promises, refunds, or business facts.
Use supplied business context only when relevant.
Mark threats, emergencies, discrimination, legal disputes, medical claims, payment disputes, refund demands, or personal-data issues as sensitive or urgent for human review.
For spam or abuse, remain calm and do not intensify the exchange.`,
      prompt: `Requested tone: ${tone}\nBusiness context: ${context || "None provided"}\nComment: ${comment}`,
    });

    return Response.json(output, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    console.error("Commentaid reply error", error);
    const missingConfig = /Missing NEXT_PUBLIC_SUPABASE|API key|authentication/i.test(
      error?.message || ""
    );
    return Response.json(
      {
        error: missingConfig
          ? "Commentaid is not fully configured yet."
          : "The AI could not create a reply. Please try again.",
      },
      { status: missingConfig ? 503 : 500 }
    );
  }
}
