import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

const toClientGroup = (group, currentUserId) => {
  const participants =
    group.members?.map((member) => {
      const user = member.user;
      return user?.name || user?.username || "Friend";
    }) || [];

  const messages =
    group.messages
      ?.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      .map((message) => ({
        id: message.id,
        content: message.content,
        sender: {
          id: message.sender?.id || null,
          name: message.sender?.name || message.sender?.username || "Someone",
          isSelf: message.senderId === currentUserId,
        },
        sentAt: message.sentAt,
        groupId: group.id,
      })) || [];

  const lastMessage = messages[messages.length - 1] || null;

  return {
    id: group.id,
    name: group.name,
    participants,
    lastMessage: lastMessage
      ? `${lastMessage.sender.name}: ${lastMessage.content}`
      : "Say hi to start the chat",
    updatedAt: lastMessage?.sentAt || group.createdAt,
    messages,
  };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    groups: groups.map((group) => toClientGroup(group, session.user.id)),
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body?.name?.trim();
  const locationContext = body?.locationContext?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 }
    );
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { location: true },
  });

  const group = await prisma.group.create({
    data: {
      name,
      locationContext: locationContext || userRecord?.location || "Anywhere",
      members: {
        create: [
          {
            userId: session.user.id,
            role: "OWNER",
          },
        ],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    group: toClientGroup(group, session.user.id),
  });
}
