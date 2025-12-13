import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ROUTER_MODEL = "gemini-2.5-flash";
const FORMATTER_MODEL = "gemini-2.5-flash";
const GEMINI_KEY =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_KEY ||
  process.env.AI_STUDIO_API_KEY;

const RouteDecisionSchema = z.discriminatedUnion("route", [
  z.object({
    route: z.literal("yelp"),
    confidence: z.number().min(0).max(1),
    yelpQuery: z.string().min(1),
    missing: z.array(z.string()).optional(),
  }),
  z.object({
    route: z.literal("clarify"),
    confidence: z.number().min(0).max(1),
    question: z.string().min(1),
    missing: z.array(z.string()).default([]),
  }),
  z.object({
    route: z.literal("general"),
    confidence: z.number().min(0).max(1),
    reply: z.string().min(1),
  }),
]);

const safeJsonParse = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to extract first JSON object from noisy output.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

export const stripYelpMention = (text) =>
  String(text || "").replace(/(^|\s)@yelp(\s|$)/gi, " ").trim();

const looksNonYelp = (text) => {
  const value = stripYelpMention(text).toLowerCase();
  const nonYelpPatterns = [
    "how are you",
    "how's it going",
    // "tell me a joke",
    // "joke",
    "recursion",
    "explain",
    "math",
    "history",
    "code",
    "programming",
    "typescript",
    "javascript",
    "react",
    "nextjs",
    "next.js",
  ];
  const yelpIntentTokens = [
    "restaurant",
    "food",
    "eat",
    "dinner",
    "lunch",
    "brunch",
    "breakfast",
    "bar",
    "cafe",
    "coffee",
    "pizza",
    "ramen",
    "tacos",
    "sushi",
    "open now",
    "near",
    "nearby",
    "in ",
    "reviews",
    "rating",
    "cheap",
    "$",
    "$$",
  ];

  const containsNonYelp = nonYelpPatterns.some((pattern) => value.includes(pattern));
  const containsYelp = yelpIntentTokens.some((token) => value.includes(token));
  return containsNonYelp && !containsYelp;
};

export const cheapRoutePrefilter = ({ text }) => {
  if (looksNonYelp(text)) {
    return {
      route: "general",
      confidence: 0.9,
      reply:
        "Doing great. If you tell me what city you’re in and what you’re craving, I can recommend a few spots.",
    };
  }
  return null;
};

export const routeWithGemini = async ({ text, context = {} }) => {
  const pre = cheapRoutePrefilter({ text });
  if (pre) return pre;

  if (!GEMINI_KEY) {
    return {
      route: "yelp",
      confidence: 0.55,
      yelpQuery: stripYelpMention(text) || "Find great food nearby",
    };
  }

  const client = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const cleaned = stripYelpMention(text);

  const prompt = [
    "You are a routing agent for a chat app with a Yelp tool.",
    "",
    "Your job: decide whether the user's message should call Yelp.",
    "",
    "Call Yelp ONLY when the user is seeking local businesses, places to eat/drink, services, reviews, ratings, price, hours, “near me/in X”, recommendations, comparisons, or similar.",
    "If the user’s message is small talk, general knowledge, jokes, emotions, coding help, etc., DO NOT call Yelp. Respond conversationally as @yelp, but do not use the tool.",
    "If it is a Yelp-style request but missing key details (especially location), ask a short clarifying question instead of calling Yelp.",
    "",
    "Return ONLY valid JSON matching one of:",
    '- {"route":"yelp","confidence":0..1,"yelpQuery":"..."}',
    '- {"route":"clarify","confidence":0..1,"question":"...","missing":["..."]}',
    '- {"route":"general","confidence":0..1,"reply":"..."}',
    "",
    "Context (trusted):",
    `- groupDefaultLocation: ${context.groupLocation || ""}`,
    `- userDefaultLocation: ${context.userLocation || ""}`,
    `- recentMessages: ${JSON.stringify(context.recentMessages || []).slice(0, 2000)}`,
    "",
    "User message (untrusted):",
    cleaned,
  ].join("\n");

  const result = await client.models.generateContent({
    model: ROUTER_MODEL,
    contents: prompt,
  });

  const data = safeJsonParse(result.text);
  const parsed = RouteDecisionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      route: "yelp",
      confidence: 0.5,
      yelpQuery: cleaned || "Find great food nearby",
    };
  }

  return parsed.data;
};

export const formatWithGemini = async ({
  userText,
  yelpText,
  businesses = [],
  groupContext = "",
}) => {
  if (!GEMINI_KEY) return yelpText;

  const client = new GoogleGenAI({ apiKey: GEMINI_KEY });

  const prompt = [
    "You are @yelp inside Cravemate, a group dining concierge.",
    "Given raw Yelp AI findings and structured business data, craft a concise group-chat reply.",
    "Rules:",
    "- Keep it under 4 sentences.",
    "- Mention at most 3 businesses.",
    "- Prefer concrete details (neighborhood, price, vibe).",
    "- If user intent is unclear, ask 1 short clarifying question instead of listing places.",
    "",
    `User message: ${stripYelpMention(userText)}`,
    `Group context: ${String(groupContext || "").slice(0, 2000)}`,
    `Yelp summary: ${String(yelpText || "").slice(0, 2500)}`,
    `Businesses: ${JSON.stringify(businesses || []).slice(0, 3000)}`,
  ].join("\n");

  try {
    const result = await client.models.generateContent({
      model: FORMATTER_MODEL,
      contents: prompt,
    });
    const text = result.text?.trim();
    return text || yelpText;
  } catch {
    return yelpText;
  }
};

