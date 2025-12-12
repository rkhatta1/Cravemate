// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim()?.toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            passwordHash: true,
            hasFinishedOnboarding: true,
          },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          hasFinishedOnboarding: user.hasFinishedOnboarding,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in / account creation
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.hasFinishedOnboarding = !!user.hasFinishedOnboarding;
        token.location = user.location;
        token.dietaryPrefs = user.dietaryPrefs;
        token.favoritesContext = user.favoritesContext;

        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              username: true,
              location: true,
              dietaryPrefs: true,
              favoritesContext: true,
              hasFinishedOnboarding: true,
            },
          });
          if (dbUser) {
            token.username = dbUser.username ?? token.username;
            token.location = dbUser.location ?? token.location;
            token.dietaryPrefs = dbUser.dietaryPrefs ?? token.dietaryPrefs;
            token.favoritesContext =
              dbUser.favoritesContext ?? token.favoritesContext;
            token.hasFinishedOnboarding = !!dbUser.hasFinishedOnboarding;
          }
        } catch (error) {
          console.warn("Failed to hydrate auth token from DB", error);
        }
      }

      // When useSession().update(...) is called on the client
      if (
        trigger === "update" &&
        session &&
        typeof session.hasFinishedOnboarding !== "undefined"
      ) {
        token.hasFinishedOnboarding = !!session.hasFinishedOnboarding;
      }

      if (trigger === "update" && session) {
        if (typeof session.location !== "undefined") {
          token.location = session.location || "";
        }
        if (typeof session.username !== "undefined") {
          token.username = session.username || "";
        }
        if (typeof session.dietaryPrefs !== "undefined") {
          token.dietaryPrefs = session.dietaryPrefs || [];
        }
        if (typeof session.favoritesContext !== "undefined") {
          token.favoritesContext = session.favoritesContext || null;
        }
      }

      // Ensure it's at least a boolean
      if (typeof token.hasFinishedOnboarding === "undefined") {
        token.hasFinishedOnboarding = false;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.hasFinishedOnboarding = !!token.hasFinishedOnboarding;
        session.user.location = token.location || "";
        session.user.dietaryPrefs = token.dietaryPrefs || [];
        session.user.favoritesContext = token.favoritesContext || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    newUser: "/onboarding",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
