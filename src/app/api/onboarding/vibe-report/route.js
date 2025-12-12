"use server";

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";
const GEMINI_KEY =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_KEY;

export async function POST(request) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      location,
      dietaryPrefs = [],
      cuisines = [],
      foods = [],
      gameRounds = [],
      answers = [],
    } = body || {};

    const prompt = `
You are creating a one-sentence, quirky, fun “vibe report” that captures someone's food personality.
Keep it under 40 words, playful, and specific. Avoid generic wording.

Context:
- Location: ${location || "unknown"}
- Dietary preferences: ${dietaryPrefs.join(", ") || "none specified"}
- Favorite cuisines: ${cuisines.join(", ") || "none provided"}
- Favorite foods: ${foods.join(", ") || "none provided"}
- Game rounds shown to user (each with cuisine and two review snippets): ${JSON.stringify(
      gameRounds
    )}
- User choices (in order): ${JSON.stringify(answers)}

Return only the single-sentence vibe line.`;

    const client = new GoogleGenAI({ apiKey: GEMINI_KEY });
    const result = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = result.text.trim();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return NextResponse.json({ vibe: text });
  } catch (error) {
    console.error("vibe-report error", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate vibe report" },
      { status: 500 }
    );
  }
}
