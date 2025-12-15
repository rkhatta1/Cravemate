import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const SECRET = process.env.REALTIME_SOCKET_SECRET;
const TTL_SECONDS = Number(process.env.REALTIME_SOCKET_TOKEN_TTL_SECONDS || 10 * 60);

const base64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signHs256 = (data, secret) =>
  crypto.createHmac("sha256", secret).update(data).digest("base64");

const signJwtHs256 = ({ payload, secret }) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(signingInput, secret)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${signature}`;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SECRET) {
    return NextResponse.json(
      { error: "REALTIME_SOCKET_SECRET is not set" },
      { status: 500 }
    );
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    select: { groupId: true },
  });

  const groupIds = memberships.map((m) => m.groupId);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, TTL_SECONDS);

  const token = signJwtHs256({
    secret: SECRET,
    payload: {
      sub: session.user.id,
      iat: now,
      exp,
      groups: groupIds,
    },
  });

  return NextResponse.json({
    token,
    expiresAt: exp,
    groupIds,
  });
}

