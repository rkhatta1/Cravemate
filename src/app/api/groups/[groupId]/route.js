import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { toClientGroup } from "@/lib/group-utils";

const getParams = async (context) => {
  if (!context?.params) return {};
  return (typeof context.params.then === "function"
    ? await context.params
    : context.params) || {};
};

export async function PATCH(request, context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await getParams(context);
  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const body = await request.json();
  const locationContext = body?.locationContext?.trim();

  if (!locationContext) {
    return NextResponse.json(
      { error: "Location is required" },
      { status: 400 }
    );
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isMember = group.members.some(
    (member) => member.userId === session.user.id
  );

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: { locationContext },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, username: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    group: toClientGroup(updatedGroup, session.user.id),
  });
}
