import { NextResponse } from "next/server";

const BUSINESS_SEARCH_URL = "https://api.yelp.com/v3/businesses/search";
const yelpApiKey = process.env.YELP_API_KEY || process.env.YELP_CLIENT_SECRET;
const missingCreds = !yelpApiKey;

async function fetchYelpBusinesses({ location, term }) {
  const params = new URLSearchParams({
    limit: "5",
    location,
  });

  if (term) params.set("term", term);

  const response = await fetch(`${BUSINESS_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${yelpApiKey}`,
    },
    next: { revalidate: 60 },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.description || "Unable to load Yelp businesses");
  }

  return payload;
}

const toDishIdea = ({ categories = [], cuisine, keyword }) => {
  if (keyword) return keyword;
  const topCategory = categories[0]?.title;
  if (topCategory) return `${topCategory} signature`;
  if (cuisine) return `${cuisine} favorite`;
  return "Chef's pick";
};

export async function POST(request) {
  try {
    if (missingCreds) {
      return NextResponse.json(
        { error: "Yelp API key missing from environment" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawLocation = body?.location || "";
    const cuisine = body?.cuisine || "";
    const keyword = body?.dishKeyword || "";

    const location = rawLocation.trim();
    if (!location) {
      return NextResponse.json(
        { error: "A location (city or zip) is required" },
        { status: 400 }
      );
    }

    const termParts = [cuisine, keyword].map((part) => part?.trim()).filter(Boolean);
    const term = termParts.length ? termParts.join(" ") : "restaurant";

    const result = await fetchYelpBusinesses({ location, term });
    const suggestions = (result.businesses || []).map((biz) => ({
      id: biz.id,
      restaurant: biz.name,
      rating: biz.rating,
      reviewCount: biz.review_count,
      price: biz.price || "",
      address: biz.location?.display_address?.join(", "),
      url: biz.url,
      dish: toDishIdea({
        categories: biz.categories,
        cuisine,
        keyword: keyword?.trim(),
      }),
      categories: biz.categories?.map((cat) => cat.title).filter(Boolean) || [],
      image: biz.image_url,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Yelp suggestions error", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Yelp data" },
      { status: 500 }
    );
  }
}
