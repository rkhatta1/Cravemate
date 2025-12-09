import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { toClientGroup } from "@/lib/group-utils";

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

  const resolvedLocation = locationContext || userRecord?.location;

  if (!resolvedLocation) {
    return NextResponse.json(
      {
        error:
          "Set a city or ZIP for your profile or provide a location to create this group.",
      },
      { status: 400 }
    );
  }

  const group = await prisma.group.create({
    data: {
      name,
      locationContext: resolvedLocation,
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
