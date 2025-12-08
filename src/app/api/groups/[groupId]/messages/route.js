import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

const toClientMessage = (message, currentUserId) => ({
  id: message.id,
  content: message.content,
  sentAt: message.sentAt,
  groupId: message.groupId,
  sender: {
    id: message.sender?.id || null,
    name: message.sender?.name || message.sender?.username || "Someone",
    isSelf: message.senderId === currentUserId,
  },
});

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

  const message = await prisma.message.create({
    data: {
      content,
      groupId,
      senderId: session.user.id,
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
    message: toClientMessage(message, session.user.id),
  });
}
