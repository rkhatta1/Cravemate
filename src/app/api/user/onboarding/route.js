"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      location: true,
      dietaryPrefs: true,
      favoritesContext: true,
      vibeReport: true,
      hasFinishedOnboarding: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let parsedVibe = null;
  try {
    parsedVibe = user.vibeReport ? JSON.parse(user.vibeReport) : null;
  } catch {
    parsedVibe = null;
  }

  return NextResponse.json({
    username: user.username || "",
    location: user.location || "",
    dietaryPrefs: user.dietaryPrefs || [],
    favorites: user.favoritesContext || { cuisines: [], foods: [] },
    vibeReport: parsedVibe,
    hasFinishedOnboarding: user.hasFinishedOnboarding,
  });
}
