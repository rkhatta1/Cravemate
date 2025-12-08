"use client";

import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import BasicProfileStep from "@/components/onboarding/BasicProfileStep";
import FavoritesStep from "@/components/onboarding/FavoritesStep";
import VibeGameStep from "@/components/onboarding/VibeGameStep";

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardingStep } = useUserStore();
  const { status } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (!isMounted || status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
        <div className="bg-gray-100 h-2 w-full">
          <div
            className="bg-orange-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${(onboardingStep / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {onboardingStep === 1 && <BasicProfileStep />}
          {onboardingStep === 2 && <FavoritesStep />}
          {onboardingStep === 3 && <VibeGameStep />}
        </div>
      </div>
    </div>
  );
}
