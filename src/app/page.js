"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import FloatingElements from "@/components/landing/FloatingElements";

export default function LandingPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  const handleCTAClick = () => {
    if (status === "authenticated") {
      const hasFinishedOnboarding = session?.user?.hasFinishedOnboarding;
      router.push(hasFinishedOnboarding ? "/home" : "/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-red-100 selection:text-red-900 overflow-x-hidden">
      <Header onSignIn={handleCTAClick} />

      <main className="relative">
        <Hero onSignIn={handleCTAClick} />

        {/* Visual Anchor for the "Fold" */}
        <div className="relative z-10 -mt-8 mb-0">
          <FloatingElements />
        </div>
        <SocialProof />

        {/* Footer placeholder */}
        <footer className="bg-neutral-50 py-12 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>© 2024 Cravemate Inc.</div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-black">
                Privacy
              </a>
              <a href="#" className="hover:text-black">
                Terms
              </a>
              <a href="#" className="hover:text-black">
                Twitter
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
