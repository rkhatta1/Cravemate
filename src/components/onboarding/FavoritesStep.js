"use client";

import { useMemo, useState } from "react";
import { useUserStore } from "@/store/user-store";

const CUISINE_OPTIONS = [
  "Mexican",
  "Italian",
  "Japanese",
  "Indian",
  "Thai",
  "Mediterranean",
  "Korean",
  "American Comfort",
  "Middle Eastern",
  "Vietnamese",
  "Chinese",
  "Caribbean",
];

const DISH_IDEAS = {
  Mexican: ["Al Pastor Tacos", "Chilaquiles", "Elote"],
  Italian: ["Cacio e Pepe", "Margherita Pizza", "Tiramisu"],
  Japanese: ["Spicy Tuna Roll", "Ramen", "Okonomiyaki"],
  Indian: ["Paneer Tikka", "Masala Dosa", "Butter Chicken"],
  Thai: ["Pad Kee Mao", "Green Curry", "Mango Sticky Rice"],
  Mediterranean: ["Chicken Shawarma", "Falafel Plate", "Greek Salad"],
  Korean: ["Bibimbap", "Korean Fried Chicken", "Tteokbokki"],
  "American Comfort": ["Smash Burger", "Hot Chicken Sandwich", "Mac n Cheese"],
  "Middle Eastern": ["Lamb Kofta", "Hummus Bowl", "Baklava"],
  Vietnamese: ["Banh Mi", "Pho", "Bun Cha"],
  Chinese: ["Soup Dumplings", "Mapo Tofu", "Scallion Pancakes"],
  Caribbean: ["Jerk Chicken", "Ropa Vieja", "Cuban Sandwich"],
};

const FOOD_WORDS = Array.from(new Set(Object.values(DISH_IDEAS).flat()));

export default function FavoritesStep() {
  const { favorites, setFavorites, setStep, profile } = useUserStore();

  const [selectedCuisines, setSelectedCuisines] = useState(
    favorites.cuisines?.length ? favorites.cuisines : []
  );
  const [selectedFoods, setSelectedFoods] = useState(
    favorites.foods?.length ? favorites.foods : []
  );
  const [foodInput, setFoodInput] = useState("");
  const [helperMessage, setHelperMessage] = useState("");

  const fireHelper = (msg) => {
    setHelperMessage(msg);
    setTimeout(() => setHelperMessage(""), 2500);
  };

  const toggleCuisine = (cuisine) => {
    setSelectedCuisines((prev) => {
      let next;
      if (prev.includes(cuisine)) {
        next = prev.filter((c) => c !== cuisine);
      } else {
        if (prev.length === 3) {
          fireHelper("Pick up to three cuisines for now.");
          return prev;
        }
        next = [...prev, cuisine];
      }
      return next;
    });
  };

  const toggleFood = (food) => {
    setSelectedFoods((prev) => {
      if (prev.includes(food)) {
        return prev.filter((f) => f !== food);
      }
      if (prev.length >= 8) {
        fireHelper("Pick up to 8 foods for now.");
        return prev;
      }
      return [...prev, food];
    });
  };

  const addFoodFromInput = () => {
    const value = foodInput.trim();
    if (!value) return;
    if (selectedFoods.includes(value)) {
      setFoodInput("");
      return;
    }
    setSelectedFoods((prev) => (prev.length >= 8 ? prev : [...prev, value]));
    setFoodInput("");
  };

  const handleNext = () => {
    if (selectedCuisines.length !== 3) {
      fireHelper("Lock in three cuisines to keep things balanced.");
      return;
    }
    if (selectedFoods.length < 3) {
      fireHelper("Add at least three foods so @yelp learns your cravings.");
      return;
    }

    setFavorites({
      cuisines: selectedCuisines,
      foods: selectedFoods,
    });
    setStep(3);
  };

  const handleBack = () => setStep(1);

  const cuisineCards = useMemo(
    () =>
      CUISINE_OPTIONS.map((option) => {
        const isSelected = selectedCuisines.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggleCuisine(option)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isSelected
                ? "border-yelp-red bg-yelp-red/10 text-yelp-red"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        );
      }),
    [selectedCuisines]
  );

  const foodCloud = useMemo(
    () =>
      FOOD_WORDS.map((word, idx) => {
        const isSelected = selectedFoods.includes(word);
        const sizeClass =
          idx % 3 === 0 ? "text-base" : idx % 3 === 1 ? "text-sm" : "text-xs";
        return (
          <button
            key={word}
            type="button"
            onClick={() => toggleFood(word)}
            className={`rounded-full border px-3 py-2 font-medium transition-colors ${sizeClass} ${
              isSelected
                ? "border-yelp-red bg-yelp-red/10 text-yelp-red shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {word}
          </button>
        );
      }),
    [selectedFoods]
  );

  return (
    <div className="space-y-8 h-[80vh] flex flex-col">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-neutral-900">
          Dial in your cravings
        </h2>
        <p className="text-neutral-500">
          Choose the flavors you obsess over, then shout out the dishes you
          can’t stop ordering.
        </p>
        {!profile.location && (
          <div className="rounded-xl border border-dashed border-yelp-red/30 bg-yelp-red/10 p-3 text-sm text-yelp-red">
            Add your city or zip code in Step 1 to unlock Yelp-powered
            suggestions.
          </div>
        )}
      </div>
      <div className="space-y-8 flex flex-col overflow-auto">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Top cuisines
            </h3>
            <span className="text-sm text-neutral-500">
              {selectedCuisines.length}/3 selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">{cuisineCards}</div>
          {helperMessage && (
            <p className="text-sm font-medium text-yelp-red">{helperMessage}</p>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Favorite foods
            </h3>
            <p className="text-sm text-neutral-500">
              Tap to select the dishes you crave most, or add your own.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{foodCloud}</div>
            <div className="flex flex-wrap gap-2">
              {selectedFoods.map((food) => (
                <span
                  key={food}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white"
                >
                  {food}
                  <button
                    type="button"
                    onClick={() => toggleFood(food)}
                    className="text-white/80 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <input
                type="text"
                value={foodInput}
                onChange={(e) => setFoodInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFoodFromInput();
                  }
                }}
                placeholder="Add a custom favorite (e.g. spicy miso ramen)"
                className="flex-1 border-0 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-0"
              />
              <button
                type="button"
                onClick={addFoodFromInput}
                className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Add
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:justify-between">
        <button
          onClick={handleBack}
          className="w-full md:w-auto rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="w-full md:w-auto rounded-xl bg-neutral-900 px-6 py-3 font-semibold text-white transition-transform hover:bg-neutral-800 active:scale-95"
        >
          Lock choices →
        </button>
      </div>
    </div>
  );
}
