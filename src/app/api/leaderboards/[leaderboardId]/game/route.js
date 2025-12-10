import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const comboKey = (a, b) => {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

const serializeEntry = (entry) => ({
  id: entry.id,
  businessName: entry.businessName,
  blurb: entry.blurb,
  neighborhood: entry.neighborhood,
  elo: entry.elo,
  meta: entry.meta || {},
});

async function loadLeaderboardWithEntries(leaderboardId) {
  return prisma.leaderboard.findUnique({
    where: { id: leaderboardId },
    include: {
      entries: {
        orderBy: [
          { elo: "desc" },
          { rank: "asc" },
        ],
      },
    },
  });
}

async function findNextPair({ leaderboard, playerId, anchorId }) {
  const matches = await prisma.leaderboardMatch.findMany({
    where: {
      leaderboardId: leaderboard.id,
      playerId,
    },
    select: { pairKey: true },
  });
  const seen = new Set(matches.map((match) => match.pairKey));
  const entries = leaderboard.entries || [];
  if (entries.length < 2) return null;

  if (anchorId) {
    const anchor = entries.find((entry) => entry.id === anchorId);
    if (!anchor) {
      return { error: "anchor_missing" };
    }
    for (const entry of entries) {
      if (entry.id === anchor.id) continue;
      const key = comboKey(anchor.id, entry.id);
      if (!seen.has(key)) {
        return [anchor, entry];
      }
    }
    return null;
  }

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const first = entries[i];
      const second = entries[j];
      const key = comboKey(first.id, second.id);
      if (!seen.has(key)) {
        return [first, second];
      }
    }
  }

  return null;
}

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await context?.params;
    const leaderboardId = resolvedParams?.leaderboardId;
    if (!leaderboardId) {
      return NextResponse.json({ error: "Missing leaderboard id" }, { status: 400 });
    }
    const url = new URL(request.url);
    const anchorId = url.searchParams.get("anchor");

    const leaderboard = await loadLeaderboardWithEntries(leaderboardId);
    if (!leaderboard) {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    const pair = await findNextPair({
      leaderboard,
      playerId: session.user.id,
      anchorId,
    });

    if (pair?.error === "anchor_missing") {
      return NextResponse.json({ error: "Anchor entry no longer exists." }, { status: 400 });
    }

    if (!pair) {
      return NextResponse.json({ message: "No fresh matches" }, { status: 204 });
    }

    return NextResponse.json({
      pair: pair.map((entry) => serializeEntry(entry)),
    });
  } catch (error) {
    console.error("Leaderboard game GET error", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch match" },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await context?.params;
    const leaderboardId = resolvedParams?.leaderboardId;
    if (!leaderboardId) {
      return NextResponse.json({ error: "Missing leaderboard id" }, { status: 400 });
    }
    const body = await request.json();
    const entryAId = body?.entryAId;
    const entryBId = body?.entryBId;
    const winnerId = body?.winnerId;
    const loserId = body?.loserId;
    const skip = !!body?.skip;

    if (!entryAId || !entryBId) {
      return NextResponse.json(
        { error: "Both entry identifiers are required" },
        { status: 400 }
      );
    }

    const pairKey = comboKey(entryAId, entryBId);

    const entries = await prisma.leaderboardEntry.findMany({
      where: {
        id: { in: [entryAId, entryBId] },
        leaderboardId,
      },
      select: { id: true },
    });

    if (entries.length !== 2) {
      return NextResponse.json(
        { error: "Invalid restaurants for this leaderboard" },
        { status: 400 }
      );
    }

    if (skip) {
      await prisma.leaderboardMatch.create({
        data: {
          leaderboardId,
          playerId: session.user.id,
          entryAId,
          entryBId,
          pairKey,
          skipped: true,
        },
      });
      return NextResponse.json({ skipped: true });
    }

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { error: "Winner and loser are required unless skipping" },
        { status: 400 }
      );
    }

    const isWinnerValid = winnerId === entryAId || winnerId === entryBId;
    const isLoserValid = loserId === entryAId || loserId === entryBId;

    if (!isWinnerValid || !isLoserValid) {
      return NextResponse.json(
        { error: "Winner and loser must be part of the match" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.leaderboardMatch.create({
        data: {
          leaderboardId,
          playerId: session.user.id,
          entryAId,
          entryBId,
          winnerId,
          pairKey,
        },
      });

      const winner = await tx.leaderboardEntry.update({
        where: { id: winnerId },
        data: { elo: { increment: 10 } },
      });

      const loser = await tx.leaderboardEntry.update({
        where: { id: loserId },
        data: { elo: { decrement: 10 } },
      });

      return {
        winner,
        loser,
      };
    });

    return NextResponse.json({
      winner: serializeEntry(result.winner),
      loser: serializeEntry(result.loser),
    });
  } catch (error) {
    console.error("Leaderboard game POST error", error);
    return NextResponse.json(
      { error: error.message || "Failed to record match" },
      { status: 500 }
    );
  }
}
