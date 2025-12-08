"use client";

import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// We will build these sub-components next
import BasicProfileStep from "@/components/onboarding/BasicProfileStep";
import FavoritesStep from "@/components/onboarding/FavoritesStep";
import VibeGameStep from "@/components/onboarding/VibeGameStep";

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardingStep, resetOnboarding } = useUserStore();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
        
        {/* Progress Bar */}
        <div className="bg-gray-100 h-2 w-full">
          <div 
            className="bg-orange-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${(onboardingStep / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step Switcher */}
          {onboardingStep === 1 && <BasicProfileStep />}
          {onboardingStep === 2 && <FavoritesStep />}
          {onboardingStep === 3 && <VibeGameStep />}
        </div>
      
      </div>
    </div>
  );
}
