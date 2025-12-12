import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse({
    email: body?.email?.trim()?.toLowerCase(),
    password: body?.password,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and a password (8+ characters)." },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (existing?.id) {
    const message = existing.passwordHash
      ? "An account with this email already exists."
      : "This email is already linked to Google sign-in. Please continue with Google.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const defaultName = email.split("@")[0] || "Cravemate user";

  await prisma.user.create({
    data: {
      email,
      name: defaultName,
      passwordHash,
      hasFinishedOnboarding: false,
    },
  });

  return NextResponse.json({ ok: true });
}

