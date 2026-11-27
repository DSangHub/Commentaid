import { Output, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { createAdminSupabase, requireUser } from "../../../lib/supabase";
import { releaseReservation, reserveInteraction, mexicoPromotion } from "../../../lib/billing";
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
    const configured = String(process.env.OPENAI_MODEL || "").trim();
    const validModelName =
      /^[a-z0-9][a-z0-9._:-]{2,100}$/i.test(configured) &&
      !configured.startsWith("sk-");
    return openai(validModelName ? configured : "gpt-5-mini");
  }

  return process.env.AI_MODEL || "openai/gpt-5-mini";
}

export async function POST(request) {
  let billingAdmin = null;
  let billingUserId = "";
  let reservation = null;
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
    const commentId = typeof body.commentId === "string" ? body.commentId : "";
    const languageChoices = { en:"English", es:"Spanish", fr:"French", pt:"Portuguese", de:"German", it:"Italian", nl:"Dutch", ar:"Arabic", hi:"Hindi", ur:"Urdu", pa:"Punjabi", id:"Indonesian", zh:"Chinese", ja:"Japanese", ko:"Korean", vi:"Vietnamese", th:"Thai", tr:"Turkish", ru:"Russian", bn:"Bengali", sw:"Swahili", tl:"Filipino", ta:"Tamil", te:"Telugu" };
    const replyLanguage = typeof body.replyLanguage === "string" && Object.hasOwn(languageChoices, body.replyLanguage) ? body.replyLanguage : "original";
    const targetLanguage = replyLanguage === "original" ? "the commenter’s original language" : languageChoices[replyLanguage];

    if (!comment || comment.length > 3000) {
      return Response.json(
        { error: "Enter a comment between 1 and 3,000 characters." },
        { status: 400 }
      );
    }

    billingAdmin = createAdminSupabase();
    billingUserId = auth.user.id;
    reservation = await mexicoPromotion(billingAdmin, request, auth.user.id, "reserve") || await reserveInteraction(billingAdmin, auth.user.id);
    if (!reservation?.allowed) {
      return Response.json(
        {
          error: reservation?.promotion === "mexico" ? "Has utilizado las 100 interacciones gratuitas de la promoción." : reservation?.plan === "creator"
            ? "Your Creator plan has used all 100 AI interactions for this billing period. Upgrade to continue."
            : "Your 10 free AI interactions have been used. Choose a paid plan to continue.",
          usage: reservation,
        },
        { status: 402, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const { output } = await generateText({
      model: getModel(),
      output: Output.object({ schema: replySchema }),
      system: `You are Commentaid, a multilingual comment-response assistant for creators and businesses.
Detect the comment's language and translate it naturally into English.
Draft exactly three useful replies in ${targetLanguage}, with an English rendering of each. The language field must describe the original comment language.
Keep replies concise, culturally respectful, and faithful to the requested tone.
Never invent prices, availability, policies, links, promises, refunds, or business facts.
Use supplied business context only when relevant.
Mark threats, emergencies, discrimination, legal disputes, medical claims, payment disputes, refund demands, or personal-data issues as sensitive or urgent for human review.
For spam or abuse, remain calm and do not intensify the exchange.`,
      prompt: `Requested tone: ${tone}\nBusiness context: ${context || "None provided"}\nComment: ${comment}`,
    });

    let responseOutput = { ...output, replyLanguage: targetLanguage === "the commenter’s original language" ? output.language : targetLanguage };
    if (commentId) {
      const { data: managedComment, error: commentError } = await billingAdmin.from("managed_comments")
        .select("id").eq("id", commentId).eq("user_id", auth.user.id).single();
      if (commentError || !managedComment) {
        await releaseReservation(billingAdmin, billingUserId, reservation);
        reservation = null;
        return Response.json({ error: "Managed comment not found." }, { status: 404 });
      }
      const rows = output.options.map((option) => ({
        user_id: auth.user.id,
        comment_id: commentId,
        english_reply: option.replyEnglish,
        native_reply: option.reply,
        language: responseOutput.replyLanguage,
        tone,
        risk: output.risk,
      }));
      const { data: drafts, error: draftError } = await billingAdmin.from("reply_drafts").insert(rows).select("id");
      if (draftError) throw draftError;
      await billingAdmin.from("managed_comments").update({ status: output.risk === "routine" ? "drafted" : "escalated", language: output.language, updated_at: new Date().toISOString() }).eq("id", commentId).eq("user_id", auth.user.id);
      responseOutput = { ...responseOutput, options: output.options.map((option, index) => ({ ...option, draftId: drafts?.[index]?.id || null })) };
    }

    return Response.json({ ...responseOutput, usage: reservation }, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    if (billingAdmin && reservation?.allowed) {
      await releaseReservation(billingAdmin, billingUserId, reservation);
    }
    console.error("Commentaid reply error", error);
    const message = error?.message || "";
    const missingConfig = /Missing NEXT_PUBLIC_SUPABASE|authentication/i.test(message);
    const invalidKey = /invalid_api_key|incorrect api key|401 unauthorized/i.test(message);
    const billing = /insufficient_quota|billing|credit balance|quota/i.test(message);
    const invalidModel = /model.*not found|model.*does not exist|unsupported model/i.test(message);
    const publicError = missingConfig
      ? "Commentaid is not fully configured yet."
      : invalidKey
        ? "The OpenAI API key is invalid. Replace OPENAI_API_KEY in Vercel."
        : billing
          ? "OpenAI API billing or credits are required before replies can be generated."
          : invalidModel
            ? "OPENAI_MODEL is invalid. Set it to gpt-5-mini in Vercel."
            : "The AI could not create a reply. Please try again.";
    return Response.json(
      { error: publicError },
      { status: missingConfig ? 503 : 500 }
    );
  }
}
