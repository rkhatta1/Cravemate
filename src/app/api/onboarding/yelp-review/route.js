"use server";

import { NextResponse } from "next/server";

const YELP_AI_API_KEY =
  process.env.YELP_AI_API_KEY ||
  process.env.YELP_API_KEY ||
  process.env.YELP_CLIENT_SECRET;

export async function POST(request) {
  if (!YELP_AI_API_KEY) {
    return NextResponse.json({ error: "Yelp AI key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const alias = body?.alias?.trim();
    const location = body?.location?.trim() || "";

    if (!alias) {
      return NextResponse.json({ error: "Business alias required" }, { status: 400 });
    }

    const query = `Need one short, balanced review for "${alias}". Location: ${location}. Keep it concise.`;

    const response = await fetch("https://api.yelp.com/ai/chat/v2", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${YELP_AI_API_KEY}`,
      },
      body: JSON.stringify({
        request_context: { skip_text_generation: true },
        query,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.warn("Yelp review failed", payload);
      return NextResponse.json(
        { error: payload?.error?.description || "Unable to fetch review" },
        { status: 502 }
      );
    }

    const businesses =
      payload?.entities
        ?.flatMap((entity) => entity?.businesses || [])
        .filter(Boolean) || [];
    const biz = businesses[0];
    const snippets = biz?.contextual_info?.review_snippets || [];
    const clean = (text = "") =>
      text.replaceAll("[[HIGHLIGHT]]", "").replaceAll("[[ENDHIGHLIGHT]]", "").trim();

    const review =
      (snippets[0]?.comment && clean(snippets[0].comment)) ||
      clean(biz?.contextual_info?.review_snippet || "") ||
      clean(biz?.summaries?.short || biz?.summaries?.medium || "") ||
      (payload?.response?.text || "").trim();

    return NextResponse.json({ review });
  } catch (error) {
    console.error("yelp-review error", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch review" },
      { status: 500 }
    );
  }
}
