import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { toClientGroup, buildGroupContextPayload } from "@/lib/group-utils";

const memberSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  location: true,
  dietaryPrefs: true,
  favoritesContext: true,
  vibeReport: true,
};

const getParams = async (context) => {
  if (!context?.params) return {};
  return (typeof context.params.then === "function"
    ? await context.params
    : context.params) || {};
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

  const body = await request.json();
  const email = body?.email?.trim()?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isMember = group.members.some((member) => member.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: memberSelect,
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "We couldn't find a Cravemate user with that email." },
      { status: 404 }
    );
  }

  const alreadyMember = group.members.some((member) => member.userId === targetUser.id);
  if (alreadyMember) {
    return NextResponse.json(
      { error: "That user is already part of this group." },
      { status: 409 }
    );
  }

  await prisma.groupMember.create({
    data: {
      groupId,
      userId: targetUser.id,
    },
  });

  const groupWithMembers = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: memberSelect,
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, username: true },
          },
          sharedEntry: true,
        },
      },
    },
  });

  const context = buildGroupContextPayload(groupWithMembers);

  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: { groupContext: context },
    include: {
      members: {
        include: {
          user: {
            select: memberSelect,
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, username: true },
          },
          sharedEntry: true,
        },
      },
    },
  });

  return NextResponse.json({
    group: toClientGroup(updatedGroup, session.user.id),
  });
}
