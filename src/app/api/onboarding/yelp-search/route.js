"use server";

import { NextResponse } from "next/server";

const YELP_API_KEY =
  process.env.YELP_AI_API_KEY ||
  process.env.YELP_API_KEY ||
  process.env.YELP_CLIENT_SECRET;

const normalizeCuisine = (cuisine = "") => cuisine.trim();

export async function POST(request) {
  if (!YELP_API_KEY) {
    return NextResponse.json({ error: "Yelp API key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const cuisines = Array.isArray(body?.cuisines) ? body.cuisines : [];
    const location = body?.location?.trim();
    const limitPerCuisine = Number(body?.limitPerCuisine) || 2;

    if (!location) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }
    if (!cuisines.length) {
      return NextResponse.json({ error: "At least one cuisine required" }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${YELP_API_KEY}`,
      Accept: "application/json",
    };

    const results = [];

    for (const cuisine of cuisines.slice(0, 3)) {
      const params = new URLSearchParams({
        location,
        term: `${normalizeCuisine(cuisine)} restaurant`,
        categories: "restaurants",
        sort_by: "best_match",
        limit: String(limitPerCuisine),
      });

      const res = await fetch(
        `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
        { headers, cache: "no-store" }
      );
      const payload = await res.json();
      if (!res.ok) {
        console.warn("Yelp search failed", payload);
        continue;
      }
      const businesses = payload?.businesses || [];
      businesses.forEach((biz) => {
        results.push({
          id: biz.id,
          alias: biz.alias,
          name: biz.name,
          image: biz.image_url,
          location: biz.location,
          cuisine,
        });
      });
    }

    return NextResponse.json({ businesses: results.slice(0, 6) });
  } catch (error) {
    console.error("yelp-search error", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}
