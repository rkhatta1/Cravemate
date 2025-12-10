import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { toClientMessage } from "@/lib/message-utils";

export async function POST(request, context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = context;
  const resolvedParams = await params;
  const groupId = resolvedParams?.groupId;
  if (!groupId) {
    return NextResponse.json(
      { error: "Missing group id" },
      { status: 400 }
    );
  }
  const body = await request.json();
  const content = body?.content?.trim();
  const leaderboardEntryId = body?.leaderboardEntryId?.trim?.()
    ? body.leaderboardEntryId.trim()
    : body?.leaderboardEntryId;

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let sharedEntryConnect = undefined;
  if (leaderboardEntryId) {
    const entry = await prisma.leaderboardEntry.findUnique({
      where: { id: leaderboardEntryId },
    });
    if (!entry) {
      return NextResponse.json(
        { error: "Shared restaurant no longer exists" },
        { status: 400 }
      );
    }
    sharedEntryConnect = leaderboardEntryId;
  }

  const message = await prisma.message.create({
    data: {
      content,
      groupId,
      senderId: session.user.id,
      sharedEntryId: sharedEntryConnect,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      sharedEntry: true,
    },
  });

  return NextResponse.json({
    message: toClientMessage(message, session.user.id),
  });
}
