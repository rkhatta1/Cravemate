import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { toClientMessage } from "@/lib/message-utils";
import { formatWithGemini, routeWithGemini, stripYelpMention } from "@/lib/gemini-aggregator";

const YELP_AI_ENDPOINT = "https://api.yelp.com/ai/chat/v2";
const YELP_API_KEY =
  process.env.YELP_AI_API_KEY || process.env.YELP_API_KEY || process.env.YELP_CLIENT_SECRET;

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

const extractPlainMessageText = (message) => {
  if (!message?.content) return "";
  if (!message.isYelpResponse) return String(message.content || "").slice(0, 500);
  try {
    const parsed = JSON.parse(message.content);
    if (typeof parsed === "string") return parsed.slice(0, 500);
    return String(parsed?.text || "").slice(0, 500);
  } catch {
    return String(message.content || "").slice(0, 500);
  }
};

const extractYelpChatId = (payload) => {
  const candidates = [
    payload?.chat_id,
    payload?.chatId,
    payload?.output?.chat_id,
    payload?.output?.chatId,
    payload?.output?.conversation_id,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
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
        image: biz.photos?.[0] || biz.image_url || biz.contextual_info.photos?.[0].original_url,
      };
    });
};

export async function POST(request, context) {
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

  const isMember = group.members.some((member) => member.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recentMessages = await prisma.message.findMany({
    where: { groupId },
    orderBy: { sentAt: "desc" },
    take: 12,
    include: {
      sender: {
        select: { id: true, name: true, username: true },
      },
    },
  });

  const yelpContext = buildGroupContext(group);

  const decision = await routeWithGemini({
    text: query,
    context: {
      groupLocation: group.locationContext || "",
      userLocation: session.user.location || "",
      recentMessages: recentMessages
        .reverse()
        .map((message) => ({
          role: message.isYelpResponse ? "assistant" : "user",
          text: extractPlainMessageText(message),
        }))
        .slice(-8),
    },
  });

  const confidence = typeof decision?.confidence === "number" ? decision.confidence : 0;
  const requiresLocation = !group.locationContext;
  const confidenceTooLow = decision.route === "yelp" && confidence < 0.6;

  if (decision.route !== "yelp" || confidenceTooLow) {
    const fallbackClarify = requiresLocation
      ? "What city or ZIP should I search in for this group?"
      : "What are you craving (cuisine) and any must-haves like price range or “open now”?";

    const assistantText =
      decision.route === "general"
        ? decision.reply
        : decision.route === "clarify"
        ? decision.question
        : fallbackClarify;

    const messageData = {
      text: assistantText,
      businesses: [],
      routeDecision: decision,
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

  if (!YELP_API_KEY) {
    return NextResponse.json(
      { error: "Yelp AI API key missing from environment" },
      { status: 500 }
    );
  }

  if (!group.locationContext) {
    return NextResponse.json(
      { error: "Set a location for this group before asking @yelp." },
      { status: 400 }
    );
  }

  const yelpQuery = decision.yelpQuery || stripYelpMention(query);
  const finalQuery = [
    yelpQuery,
    `Location: ${group.locationContext}`,
    `Group Context:\n${yelpContext}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1400);

  const startedAt = Date.now();
  const response = await fetch(YELP_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YELP_API_KEY}`,
    },
    body: JSON.stringify({
      query: finalQuery,
      ...(group.yelpChatId ? { chat_id: group.yelpChatId } : {}),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error_description || "Failed to reach Yelp AI";
    return NextResponse.json({ error: message }, { status: response.status });
  }
  console.log("Yelp AI response payload:", JSON.stringify(payload));

  const receivedChatId = extractYelpChatId(payload);
  if (receivedChatId && !group.yelpChatId) {
    try {
      await prisma.group.update({
        where: { id: groupId },
        data: { yelpChatId: receivedChatId },
      });
    } catch (error) {
      console.warn("Failed to store Yelp chat_id for group", error);
    }
  }

  const combinedMessageText = () => {
    const candidates = [
      payload?.output?.text,
      payload?.text,
      payload?.response?.text,
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
    (await formatWithGemini({
      userText: query,
      yelpText: yelpSummaryText,
      businesses,
      groupContext: yelpContext,
    })) || yelpSummaryText || "Yelp AI responded without content.";

  const messageData = {
    text: synthesizedText,
    businesses,
    rawSummary: yelpSummaryText?.slice(0, 5000),
    routeDecision: decision,
    tool: {
      provider: "yelp",
      query: yelpQuery,
      chatId: group.yelpChatId || receivedChatId || "",
      latencyMs: Date.now() - startedAt,
    },
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
