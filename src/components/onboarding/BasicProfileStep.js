"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/user-store";
import { useLocationAutocomplete } from "@/hooks/useLocationAutocomplete";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "Pescatarian", "Keto", "Nut-Free"
];

export default function BasicProfileStep() {
  const { data: session, update } = useSession();
  const { profile, dietaryPrefs, setDietaryPrefs, setStep, updateProfile } = useUserStore();
  
  // Local state for immediate inputs
  const [location, setLocation] = useState(profile.location || "");
  const [username, setUsername] = useState(profile.username || "");
  const [locationFocused, setLocationFocused] = useState(false);
  const locationRef = useRef(null);
  const {
    suggestions: locationSuggestions,
    loading: locationLoading,
    clearSuggestions: clearLocationSuggestions,
  } = useLocationAutocomplete(location, { active: locationFocused });

  const formatLocation = (suggestion) => {
    if (!suggestion) return "";
    const region = suggestion?.context?.region?.name;
    const city = suggestion.name || suggestion.full || "";
    return region ? `${city}, ${region}` : city;
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        clearLocationSuggestions();
        setLocationFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clearLocationSuggestions]);

  useEffect(() => {
    if (!session?.user) return;
    if (!username && session.user.username) setUsername(session.user.username);
    if (!location && session.user.location) setLocation(session.user.location);
    if (!dietaryPrefs?.length && Array.isArray(session.user.dietaryPrefs)) {
      setDietaryPrefs(session.user.dietaryPrefs);
    }
  }, [session, username, location, dietaryPrefs, setDietaryPrefs]);

  const toggleDiet = (option) => {
    if (dietaryPrefs.includes(option)) {
      setDietaryPrefs(dietaryPrefs.filter((i) => i !== option));
    } else {
      setDietaryPrefs([...dietaryPrefs, option]);
    }
  };

  const handleNext = () => {
    if (!location || !username) return alert("Please fill in required fields");
    
    updateProfile({ username, location });
    update({
      username,
      location,
      dietaryPrefs,
    });
    setStep(2); 
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Let's get to know you</h2>
        <p className="text-gray-500">First, the basics. This helps us find food you can actually eat.</p>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pick a Username</label>
          <input 
            type="text" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="e.g. spicy_taco_99"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Location */}
        <div className="relative" ref={locationRef}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Your City / Zip Code
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g. San Francisco, 94103"
            value={location}
            onFocus={() => setLocationFocused(true)}
            onChange={(e) => setLocation(e.target.value)}
          />
          {locationLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          {locationSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {locationSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.id}
                  onClick={() => {
                    setLocation(formatLocation(suggestion));
                    clearLocationSuggestions();
                    setLocationFocused(false);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-gray-900">{suggestion.name}</span>
                  {suggestion.full && suggestion.full !== suggestion.name && (
                    <span className="text-xs text-gray-500">{suggestion.full}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dietary Prefs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => toggleDiet(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  dietaryPrefs.includes(option)
                    ? "bg-orange-100 border-orange-500 text-orange-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-95"
      >
        Next Step →
      </button>
    </div>
  );
}
