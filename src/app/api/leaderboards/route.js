import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const YELP_AI_API_KEY =
  process.env.YELP_AI_API_KEY ||
  process.env.YELP_AI_API_KEY ||
  process.env.YELP_CLIENT_SECRET;

const normalize = (value = "") => value.trim().toLowerCase();

const seedBlurb = (biz) => {
  const rating = typeof biz.rating === "number" ? `${biz.rating.toFixed(1)}★` : null;
  const reviews =
    typeof biz.review_count === "number" ? `${biz.review_count} reviews` : null;
  const price = biz.price || null;
  return [rating, reviews, price].filter(Boolean).join(" · ") || "Vibe verified pick";
};

const fetchSeedBusinesses = async ({ location, term, limit = 100 }) => {
  if (!YELP_AI_API_KEY) {
    throw new Error(
      "Yelp API key missing. Add YELP_AI_API_KEY or reuse YELP_AI_API_KEY in your environment."
    );
  }
  const chunkSize = 50;
  const collected = [];
  let offset = 0;

  const normalizedTerm = term?.trim()
    ? `${term.trim()} restaurant`
    : "restaurant";

  while (collected.length < limit) {
    const chunkLimit = Math.min(chunkSize, limit - collected.length);
    const params = new URLSearchParams({
      location,
      limit: String(chunkLimit),
      offset: String(offset),
      sort_by: "best_match",
      term: normalizedTerm,
      categories: "restaurants",
    });

    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${YELP_AI_API_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      const description =
        payload?.error?.description ||
        payload?.error?.code ||
        "Unable to reach Yelp search";
      throw new Error(description);
    }

    const businesses = payload.businesses || [];
    collected.push(
      ...businesses.map((biz) => ({
        businessId: biz.id,
        name: biz.name,
        blurb: seedBlurb(biz),
        neighborhood:
          biz.location?.neighborhoods?.[0] ||
          biz.location?.city ||
          biz.location?.address1 ||
          "",
        rating: biz.rating,
        reviewCount: biz.review_count,
        url: biz.url,
        price: biz.price,
        address: biz.location?.display_address?.join(", "),
        image: biz.image_url,
        categories: biz.categories?.map((cat) => cat.title).filter(Boolean) || [],
      }))
    );

    if (businesses.length < chunkLimit) {
      break;
    }

    offset += businesses.length;
  }

  return collected.slice(0, limit);
};

const includeEntries = {
  entries: {
    orderBy: [
      { elo: "desc" },
      { rank: "asc" },
      { createdAt: "asc" },
    ],
  },
};

const toResponse = (leaderboard) => ({
  ...leaderboard,
  entries: leaderboard.entries.map((entry) => ({
    ...entry,
    elo: typeof entry.elo === "number" ? entry.elo : 1000,
    meta: entry.meta || {},
  })),
});

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dish = searchParams.get("dish")?.trim();
    const location = searchParams.get("location")?.trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 6, 20);

    if (!dish || !location) {
      const leaderboards = await prisma.leaderboard.findMany({
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          entries: {
            orderBy: [{ elo: "desc" }, { rank: "asc" }],
            take: 5,
          },
        },
      });
      return NextResponse.json({
        leaderboards: leaderboards.map(toResponse),
      });
    }

    const leaderboard = await prisma.leaderboard.findUnique({
      where: {
        dishSlug_locationSlug: {
          dishSlug: normalize(dish),
          locationSlug: normalize(location),
        },
      },
      include: includeEntries,
    });

    if (!leaderboard) {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    return NextResponse.json({ leaderboard: toResponse(leaderboard) });
  } catch (error) {
    console.error("Leaderboard GET error", error);
    return NextResponse.json(
      { error: error.message || "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const dish = body?.dish?.trim();
    const location = body?.location?.trim();

    if (!dish || !location) {
      return NextResponse.json(
        { error: "Dish and location are required" },
        { status: 400 }
      );
    }

    const dishSlug = normalize(dish);
    const locationSlug = normalize(location);

    const existing = await prisma.leaderboard.findUnique({
      where: {
        dishSlug_locationSlug: { dishSlug, locationSlug },
      },
      include: includeEntries,
    });

    if (existing) {
      return NextResponse.json({ leaderboard: toResponse(existing), created: false });
    }

    const seeds = await fetchSeedBusinesses({ location, term: dish, limit: 100 });

    if (!seeds.length) {
      return NextResponse.json(
        {
          error:
            "Yelp couldn't find any restaurants for that dish in this location. Try another combo.",
        },
        { status: 404 }
      );
    }

    const leaderboard = await prisma.leaderboard.create({
      data: {
        dish,
        dishSlug,
        location,
        locationSlug,
        createdById: session.user.id,
        entries: {
          create: seeds.map((seed, index) => ({
            businessId: seed.businessId || undefined,
            businessName: seed.name,
            blurb: seed.blurb,
            neighborhood: seed.neighborhood,
            elo: 1000,
            rank: index + 1,
            meta: {
              rating: seed.rating,
              reviewCount: seed.reviewCount,
              url: seed.url,
              price: seed.price,
              address: seed.address,
              image: seed.image,
              categories: seed.categories,
            },
          })),
        },
      },
      include: includeEntries,
    });

    return NextResponse.json({
      leaderboard: toResponse(leaderboard),
      created: true,
    });
  } catch (error) {
    console.error("Leaderboard POST error", error);
    return NextResponse.json(
      { error: error.message || "Failed to create leaderboard" },
      { status: 500 }
    );
  }
}
