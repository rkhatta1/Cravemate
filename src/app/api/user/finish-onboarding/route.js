import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const {
    profile = {},
    username = null,
    dietaryPrefs = [],
    favorites = {},
    vibeReport = null,
    vibeGameAnswers = [],
  } = payload || {};

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      hasFinishedOnboarding: true,
      location: profile.location || null,
      dietaryPrefs,
      username: username || profile.username || null,
      favoritesContext: favorites,
      vibeReport: vibeReport ? JSON.stringify(vibeReport) : null,
    },
  });

  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
