// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in / account creation
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.hasFinishedOnboarding = !!user.hasFinishedOnboarding;
      }

      // When useSession().update(...) is called on the client
      if (
        trigger === "update" &&
        session &&
        typeof session.hasFinishedOnboarding !== "undefined"
      ) {
        token.hasFinishedOnboarding = !!session.hasFinishedOnboarding;
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
