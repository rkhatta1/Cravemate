import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { toClientMessage } from "@/lib/message-utils";

const getParams = async (context) => {
  if (!context?.params) return {};
  return (typeof context.params.then === "function"
    ? await context.params
    : context.params) || {};
};

const parseInviteContent = (content) => {
  if (!content) return null;
  if (typeof content === "object") {
    return content?.type === "dining-invite" ? content : null;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed?.type === "dining-invite" ? parsed : null;
  } catch {
    return null;
  }
};

const formatInviteSchedule = (schedule) => {
  if (!schedule) return "";
  if (schedule.datetime) {
    try {
      return new Date(schedule.datetime).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return schedule.datetime;
    }
  }
  if (!schedule?.date) return "";
  const start = schedule.startTime || "--";
  const end = schedule.endTime || "--";
  try {
    const dateLabel = new Date(`${schedule.date}T00:00:00`).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric" }
    );
    return `${dateLabel} · ${start}-${end}`;
  } catch {
    return `${schedule.date} · ${start}-${end}`;
  }
};

export async function POST(request, context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await getParams(context);
  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const inviteMessageId = body?.inviteMessageId?.trim?.()
    ? body.inviteMessageId.trim()
    : body?.inviteMessageId;

  if (!inviteMessageId) {
    return NextResponse.json(
      { error: "inviteMessageId is required" },
      { status: 400 }
    );
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.inviteAcceptance.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    if (existing.inviteMessageId === inviteMessageId) {
      return NextResponse.json({
        ok: true,
        inviteMessageId: existing.inviteMessageId,
        acceptedAt: existing.acceptedAt,
      });
    }

    return NextResponse.json(
      {
        error:
          "You already accepted a different invite in this group. Clear your pinned plan to accept another.",
      },
      { status: 409 }
    );
  }

  const inviteMessage = await prisma.message.findFirst({
    where: { id: inviteMessageId, groupId },
    include: {
      sender: { select: { id: true, name: true, username: true } },
      sharedEntry: true,
    },
  });

  if (!inviteMessage) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invitePayload = parseInviteContent(inviteMessage.content);
  if (!invitePayload) {
    return NextResponse.json(
      { error: "That message is not a valid invite." },
      { status: 400 }
    );
  }

  const acceptance = await prisma.inviteAcceptance.create({
    data: {
      groupId,
      userId: session.user.id,
      inviteMessageId,
    },
  });

  const userName =
    session.user.name || session.user.username || session.user.email || "Someone";
  const restaurantName = invitePayload?.restaurant?.name || "this plan";
  const scheduleLabel = formatInviteSchedule(invitePayload?.schedule);
  const responseText = `${userName} is in for ${restaurantName}${
    scheduleLabel ? ` (${scheduleLabel})` : ""
  }.`;

  const responseMessage = await prisma.message.create({
    data: {
      content: responseText,
      groupId,
      senderId: session.user.id,
    },
    include: {
      sender: { select: { id: true, name: true, username: true } },
      sharedEntry: true,
    },
  });

  return NextResponse.json({
    ok: true,
    inviteMessageId: acceptance.inviteMessageId,
    acceptedAt: acceptance.acceptedAt,
    pinnedInvite: {
      ...invitePayload,
      inviteMessageId: acceptance.inviteMessageId,
      acceptedAt: acceptance.acceptedAt,
      acceptedBy: userName,
    },
    message: toClientMessage(responseMessage, session.user.id),
  });
}

export async function DELETE(request, context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await getParams(context);
  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.inviteAcceptance.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });
  } catch {
    // ok if already removed
  }

  return NextResponse.json({ ok: true });
}
