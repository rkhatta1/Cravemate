"use client";

import { useUserStore } from "@/store/user-store";
import { useState } from "react";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "Pescatarian", "Keto", "Nut-Free"
];

export default function BasicProfileStep() {
  const { profile, dietaryPrefs, setDietaryPrefs, setStep, updateProfile } = useUserStore();
  
  // Local state for immediate inputs
  const [location, setLocation] = useState(profile.location || "");
  const [username, setUsername] = useState(profile.username || "");

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your City / Zip Code</label>
          <input 
            type="text" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="e.g. San Francisco, 94103"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
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
