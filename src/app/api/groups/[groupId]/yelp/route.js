import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { toClientMessage } from "@/lib/message-utils";

const YELP_AI_ENDPOINT = "https://api.yelp.com/ai/chat/v2";
const YELP_API_KEY =
  process.env.YELP_AI_API_KEY || process.env.YELP_API_KEY || process.env.YELP_CLIENT_SECRET;
const GEMINI_ENDPOINT = process.env.AI_STUDIO_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.AI_STUDIO_API_KEY}`
  : null;

const getParams = async (context) => {
  if (!context?.params) return {};
  return (typeof context.params.then === "function"
    ? await context.params
    : context.params) || {};
};

const summarizeMember = (member) => {
  const user = member.user;
  if (!user) return "";
  const name = user.name || user.username || "Member";
  const diets = Array.isArray(user.dietaryPrefs) ? user.dietaryPrefs : [];
  const favorites = user.favoritesContext || {};
  const cuisines = Array.isArray(favorites.cuisines) ? favorites.cuisines : [];
  const foods =
    Array.isArray(favorites.foods) && favorites.foods.length
      ? favorites.foods
      : [];
  const vibe = (() => {
    if (!user.vibeReport) return "";
    try {
      const parsed = JSON.parse(user.vibeReport);
      return parsed.headline || parsed.summary || user.vibeReport;
    } catch {
      return user.vibeReport;
    }
  })();

  const lines = [`- ${name}`];
  if (vibe) lines.push(`  vibe: ${vibe}`);
  if (diets.length) lines.push(`  dietary: ${diets.join(", ")}`);
  if (cuisines.length) lines.push(`  cuisines: ${cuisines.join(", ")}`);
  if (foods.length) {
    const foodSummary = foods.slice(0, 5).join("; ");
    lines.push(`  foods: ${foodSummary}`);
  }
  return lines.join("\n");
};

const buildGroupContext = (group) => {
  const lines = [
    `Group name: ${group.name}`,
    `Group location context: ${group.locationContext || "Not specified"}`,
  ];

  const memberSummaries =
    group.members
      ?.map((member) => summarizeMember(member))
      .filter(Boolean) || [];

  if (memberSummaries.length) {
    lines.push("Members:");
    lines.push(memberSummaries.join("\n"));
  }

  return lines.join("\n");
};

const collectBusinesses = (payload) => {
  const sources = [
    payload?.output?.businesses,
    payload?.businesses,
    payload?.results,
  ];

  if (Array.isArray(payload?.entities)) {
    payload.entities.forEach((entity) => {
      if (Array.isArray(entity?.businesses)) {
        sources.push(entity.businesses);
      }
    });
  }

  return sources
    .filter(Array.isArray)
    .flat()
    .map((biz) => {
      const categories = Array.isArray(biz?.categories)
        ? biz.categories.map((cat) => cat.title || cat).filter(Boolean)
        : biz?.categories
        ? [biz.categories]
        : [];

      return {
        id: biz.business_id || biz.id || biz.alias || biz.slug || biz.name,
        name: biz.name,
        rating: biz.rating,
        price: biz.price,
        address:
          biz.location?.display_address?.join(", ") ||
          biz.location?.formatted_address ||
          biz.address ||
          "",
        url: biz.url,
        categories,
        image: biz.photos?.[0] || biz.image_url,
      };
    });
};

const synthesizeWithGemini = async ({ query, yelpText, businesses, groupContext }) => {
  if (!GEMINI_ENDPOINT) return yelpText;
  try {
    const prompt = [
      "You are @yelp inside Cravemate, a group dining concierge.",
      "Given the raw Yelp AI findings and structured business data, craft a concise group-chat reply.",
      "Address the group collectively, highlight ambience/dietary alignment, and suggest actions (e.g., 'Want me to check availability?').",
      "Keep it under 4 sentences and reference at most 3 businesses.",
      "",
      `User query: ${query}`,
      `Group context:\n${groupContext}`,
      `Yelp summary text: ${yelpText || "(empty)"}`,
      `Business data:\n${JSON.stringify(businesses).slice(0, 4000)}`,
    ].join("\n");

    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const payload = await response.json();
    console.log("Gemini response payload:", payload);
    const generated =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || part)
        .filter(Boolean)
        .join("\n")
        ?.trim() || payload?.text;
    return generated?.trim() || yelpText;
  } catch (error) {
    console.error("Gemini synthesis failed:", error);
    return yelpText;
  }
};

export async function POST(request, context) {
  if (!YELP_API_KEY) {
    return NextResponse.json(
      { error: "Yelp AI API key missing from environment" },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await getParams(context);
  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const body = await request.json();
  const query = body?.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Query is required for Yelp AI" },
      { status: 400 }
    );
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              location: true,
              dietaryPrefs: true,
              favoritesContext: true,
              vibeReport: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (!group.locationContext) {
    return NextResponse.json(
      { error: "Set a location for this group before asking @yelp." },
      { status: 400 }
    );
  }

  const isMember = group.members.some((member) => member.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const yelpContext = buildGroupContext(group);
  const finalQuery = `${query}\n\nGroup Context:\n${yelpContext}`.slice(0, 1000);

  const response = await fetch(YELP_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YELP_API_KEY}`,
    },
    body: JSON.stringify({
      query: finalQuery,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error_description || "Failed to reach Yelp AI";
    return NextResponse.json({ error: message }, { status: response.status });
  }
  console.log("Yelp AI response payload:", payload);

  const combinedMessageText = () => {
    const candidates = [
      payload?.output?.text,
      payload?.text,
      payload?.output?.response?.text,
      Array.isArray(payload?.output?.messages)
        ? payload.output.messages
            .map((msg) => {
              if (!msg) return "";
              if (typeof msg === "string") return msg;
              return msg.text || msg.content || "";
            })
            .filter(Boolean)
            .join("\n")
        : "",
    ];
    const text = candidates.find((candidate) => candidate && candidate.trim());
    return text?.trim();
  };

  const yelpSummaryText = combinedMessageText() || "";
  const businesses = collectBusinesses(payload);
  const synthesizedText =
    (await synthesizeWithGemini({
      query,
      yelpText: yelpSummaryText,
      businesses,
      groupContext: yelpContext,
    })) || yelpSummaryText || "Yelp AI responded without content.";

  const messageData = {
    text: synthesizedText,
    businesses,
    rawSummary: yelpSummaryText,
  };

  const yelpMessage = await prisma.message.create({
    data: {
      content: JSON.stringify(messageData),
      groupId,
      isYelpResponse: true,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });

  return NextResponse.json({
    message: toClientMessage(yelpMessage, session.user.id),
  });
}
