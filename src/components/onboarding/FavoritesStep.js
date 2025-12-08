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

const emptyDish = { cuisine: "", name: "", restaurant: "" };

const createYelpSlot = () => ({ loading: false, error: "", items: [] });

export default function FavoritesStep() {
  const { favorites, setFavorites, setStep, profile } = useUserStore();

  const [selectedCuisines, setSelectedCuisines] = useState(
    favorites.cuisines?.length ? favorites.cuisines : []
  );
  const [dishCombos, setDishCombos] = useState(() => {
    if (favorites.dishes?.length === 3) {
      return favorites.dishes;
    }
    return Array.from({ length: 3 }, () => ({ ...emptyDish }));
  });
  const [helperMessage, setHelperMessage] = useState("");
  const [yelpSlots, setYelpSlots] = useState(() =>
    Array.from({ length: 3 }, () => createYelpSlot())
  );

  const fireHelper = (msg) => {
    setHelperMessage(msg);
    setTimeout(() => setHelperMessage(""), 2500);
  };

  const updateYelpSlot = (index, patch) => {
    setYelpSlots((prev) =>
      prev.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    );
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

      setDishCombos((combos) =>
        combos.map((combo) =>
          combo.cuisine && !next.includes(combo.cuisine)
            ? { ...combo, cuisine: "" }
            : combo
        )
      );

      return next;
    });
  };

  const updateDish = (index, field, value) => {
    setDishCombos((prev) =>
      prev.map((combo, comboIndex) =>
        comboIndex === index ? { ...combo, [field]: value } : combo
      )
    );
    if (field === "cuisine") {
      updateYelpSlot(index, { items: [] });
    }
  };

  const fetchYelpSuggestions = async (index) => {
    const combo = dishCombos[index];
    if (!profile.location?.trim()) {
      fireHelper("Add a city or zip code first to unlock Yelp ideas.");
      return;
    }
    if (!combo.cuisine) {
      fireHelper("Pick a cuisine for this card before summoning Yelp.");
      return;
    }

    updateYelpSlot(index, { loading: true, error: "" });

    try {
      const response = await fetch("/api/yelp/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: profile.location,
          cuisine: combo.cuisine,
          dishKeyword: combo.name,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to reach Yelp AI");
      }

      updateYelpSlot(index, {
        loading: false,
        error: "",
        items: payload?.suggestions || [],
      });
    } catch (error) {
      updateYelpSlot(index, {
        loading: false,
        error: error.message || "Could not load Yelp suggestions",
      });
    }
  };

  const applyYelpSuggestion = (index, suggestion) => {
    updateDish(index, "name", suggestion.dish || "");
    updateDish(index, "restaurant", suggestion.restaurant || "");
  };

  const handleNext = () => {
    if (selectedCuisines.length !== 3) {
      fireHelper("Lock in three cuisines to keep things balanced.");
      return;
    }

    const completedCombos = dishCombos.filter(
      (combo) => combo.cuisine && combo.name && combo.restaurant
    );

    if (completedCombos.length !== 3) {
      fireHelper("Describe a dish + go-to spot for each cuisine.");
      return;
    }

    setFavorites({
      cuisines: selectedCuisines,
      dishes: dishCombos,
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              isSelected
                ? "bg-orange-100 border-orange-500 text-orange-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        );
      }),
    [selectedCuisines]
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Dial in your cravings</h2>
        <p className="text-gray-500">
          Choose the flavors you obsess over, then tell us the exact dish + spot you rave about.
        </p>
        {!profile.location && (
          <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/70 p-3 text-sm text-orange-700">
            Add your city or zip code in Step 1 to unlock Yelp-powered suggestions.
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Top cuisines</h3>
          <span className="text-sm text-gray-500">
            {selectedCuisines.length}/3 selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">{cuisineCards}</div>
        {helperMessage && (
          <p className="text-sm text-orange-600 font-medium">{helperMessage}</p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Signature dishes + go-to spots</h3>
          <p className="text-sm text-gray-500">
            Each card should shout out a dish from the cuisines above, and where your crew has to order it.
          </p>
        </div>

        <div className="space-y-4">
          {dishCombos.map((combo, index) => (
            <div
              key={`dish-${index}`}
              className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-3"
            >
              <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
                Dish #{index + 1}
                <button
                  type="button"
                  onClick={() => fetchYelpSuggestions(index)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
                  disabled={yelpSlots[index].loading}
                >
                  {yelpSlots[index].loading ? "Talking to Yelp..." : "Pull from Yelp"}
                </button>
              </div>
              {!combo.cuisine && (
                <p className="text-xs text-red-500">Select a cuisine first</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Cuisine
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:ring-2 focus:ring-orange-500"
                    value={combo.cuisine}
                    onChange={(e) => updateDish(index, "cuisine", e.target.value)}
                    disabled={!selectedCuisines.length}
                  >
                    <option value="">
                      {selectedCuisines.length
                        ? "Pick from your list"
                        : "Select cuisines first"}
                    </option>
                    {selectedCuisines.map((cuisine) => (
                      <option key={cuisine} value={cuisine}>
                        {cuisine}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Dish name
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Green curry with tofu"
                    value={combo.name}
                    onChange={(e) => updateDish(index, "name", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Favorite restaurant for this dish
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Restaurant + neighborhood"
                  value={combo.restaurant}
                  onChange={(e) => updateDish(index, "restaurant", e.target.value)}
                />
              </div>

              {combo.cuisine && (
                <div className="text-xs text-gray-500">
                  Need ideas? Try:{" "}
                  <span className="font-semibold text-gray-600">
                    {(DISH_IDEAS[combo.cuisine] || ["House specialty"])
                      .slice(0, 2)
                      .join(", ")}
                  </span>
                </div>
              )}

              {yelpSlots[index].error && (
                <p className="text-xs text-red-500">{yelpSlots[index].error}</p>
              )}

              {yelpSlots[index].items.length > 0 && (
                <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Yelp says try these
                  </p>
                  <div className="space-y-2">
                    {yelpSlots[index].items.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => applyYelpSuggestion(index, suggestion)}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-orange-400 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-800">
                            {suggestion.restaurant}
                          </p>
                          <p className="text-sm text-gray-500">
                            {typeof suggestion.rating === "number"
                              ? `${suggestion.rating.toFixed(1)}★`
                              : ""}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{suggestion.dish}</p>
                        {suggestion.address && (
                          <p className="text-xs text-gray-500">{suggestion.address}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:justify-between">
        <button
          onClick={handleBack}
          className="w-full md:w-auto rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="w-full md:w-auto rounded-xl bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 transition-transform active:scale-95"
        >
          Lock choices →
        </button>
      </div>
    </div>
  );
}
