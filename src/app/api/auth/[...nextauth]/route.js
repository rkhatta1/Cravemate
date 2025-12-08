// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma"; 

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Pass the user ID to the client session
      if (session.user) {
        session.user.id = user.id;
        session.user.username = user.username;
        session.user.hasFinishedOnboarding = !!user.vibeReport;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',      // Custom login page
    newUser: '/onboarding', // Redirect here after sign up
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
