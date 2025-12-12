import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createCalendarEvent } from "@/lib/googleCalendar";
import { normalizeInviteRestaurant } from "@/lib/invite-utils";

const isoIsValid = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envReady =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN;

  if (!envReady) {
    return NextResponse.json(
      { error: "Google Calendar credentials missing from environment" },
      { status: 501 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const context = body?.context;
  const schedule = body?.schedule;
  if (!context || !schedule) {
    return NextResponse.json(
      { error: "Invite context and schedule are required" },
      { status: 400 }
    );
  }

  const { startISO, endISO, timezone } = schedule;
  if (!isoIsValid(startISO) || !isoIsValid(endISO)) {
    return NextResponse.json(
      { error: "Invalid schedule times provided" },
      { status: 400 }
    );
  }

  const restaurant = normalizeInviteRestaurant(context);
  const summary = `Cravemate: ${restaurant.name}`;
  const descriptionParts = [
    `Plan via Cravemate for ${restaurant.name}`,
    restaurant.address ? `Address: ${restaurant.address}` : null,
    restaurant.url ? `Link: ${restaurant.url}` : null,
  ].filter(Boolean);

  try {
    console.log("[calendar] creating event", {
      userId: session.user.id,
      summary,
      schedule,
      restaurant,
    });
    const event = await createCalendarEvent({
      summary,
      description: descriptionParts.join("\n"),
      location: restaurant.address || restaurant.neighborhood || "",
      start: {
        dateTime: startISO,
        timeZone: timezone || "UTC",
      },
      end: {
        dateTime: endISO,
        timeZone: timezone || "UTC",
      },
    });

    console.log("[calendar] event created", {
      eventId: event?.id,
      htmlLink: event?.htmlLink,
      summary: event?.summary,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Calendar event creation failed", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
