"use server";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const TOKEN = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const sessionToken = searchParams.get("session_token")?.trim() || randomUUID();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!TOKEN) {
      return NextResponse.json(
        { error: "Mapbox token is not configured" },
        { status: 500 }
      );
    }

    const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", TOKEN);
    url.searchParams.set("session_token", sessionToken);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      const message = `Mapbox suggest failed: ${response.status}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const payload = await response.json();
    const suggestions =
      payload?.suggestions?.map((item) => ({
        id: item.mapbox_id,
        name: item.name,
        full: item.place_formatted || item.name,
        featureType: item.feature_type,
        context: item.context,
      })) || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
