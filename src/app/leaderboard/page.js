"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Crown, Loader2, MapPin, Share2, Sparkles } from "lucide-react";

const MOCK_LEADERS = [
  {
    id: "venezias",
    name: "Venezia's New York Style Pizzeria",
    blurb: "Counter-service pies with vegan friendly swaps and big group tables.",
    neighborhood: "Tempe · Broadway",
  },
  {
    id: "my-pie",
    name: "My Pie Pizza",
    blurb: "DIY toppings, patio energy, and late hours for group hangs.",
    neighborhood: "Tempe · Downtown",
  },
  {
    id: "prince-st",
    name: "Prince Street Pizza",
    blurb: "NYC slices with crispy edges and square pies built for sharing.",
    neighborhood: "Tempe · Mill Ave",
  },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dishInput, setDishInput] = useState("");
  const [selectedDish, setSelectedDish] = useState("");
  const [city, setCity] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.location) {
      setCity(session.user.location);
    }
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const subtitle = useMemo(() => {
    if (!selectedDish) {
      return "Kick off a leaderboard for your crew's cravings. Pick a dish and we'll seed it with Yelp intel.";
    }
    return `Tracking the best ${selectedDish} spots around ${city || "your city"}. Keep voting to nudge the rankings.`;
  }, [selectedDish, city]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleCreateLeaderboard = (event) => {
    event.preventDefault();
    const trimmedDish = dishInput.trim();
    if (!trimmedDish) {
      setError("Give us a dish to rank—tacos, ramen, vegan pastries, anything.");
      return;
    }
    setError("");
    setIsLoading(true);
    const seededEntries = MOCK_LEADERS.map((entry, index) => ({
      ...entry,
      elo: 1500 + (MOCK_LEADERS.length - index - 1) * 24,
      position: index + 1,
    }));
    setEntries(seededEntries);
    setSelectedDish(trimmedDish);
    setDishInput("");
    setTimeout(() => setIsLoading(false), 300);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-10">
        <button
          onClick={() => router.push("/home")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to chats
        </button>

        <header className="rounded-3xl border border-gray-100 bg-white/90 px-8 py-10 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-yelp-red">
            <Sparkles size={16} />
            Leaderboard Lab
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Build the definitive ranking.
              </h1>
              <p className="mt-2 text-base text-gray-600">{subtitle}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-neutral-50 px-4 py-3 text-sm text-gray-600">
              <p className="flex items-center gap-2 font-semibold text-gray-800">
                <MapPin size={16} />
                {city || "No city set"}
              </p>
              <p className="text-xs text-gray-500">
                Leaderboards stay city-specific to spare the API bill.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <form onSubmit={handleCreateLeaderboard} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Dish or craving
              </label>
              <input
                type="text"
                placeholder="e.g. chili crisp dumplings"
                value={dishInput}
                onChange={(event) => setDishInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-base focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                We use Yelp data + vibe picks to seed the first bracket. You can refine it with matches later.
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create leaderboard"
                )}
              </button>
            </div>
            {error && <p className="text-sm font-semibold text-yelp-red">{error}</p>}
          </form>
        </section>

        {!selectedDish && (
          <section className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center text-gray-500">
            <p className="text-lg font-semibold text-gray-800">
              No leaderboard yet.
            </p>
            <p className="mt-2 text-sm">
              Plug in a dish to spin up the first bracket, then invite your group to keep playing.
            </p>
          </section>
        )}

        {selectedDish && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDish} · {city || "City TBD"}
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Seeded rankings
              </span>
            </div>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yelp-red/10 text-lg font-bold text-yelp-red">
                      {entry.position}
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        {entry.position === 1 && <Crown className="h-5 w-5 text-amber-400" />}
                        {entry.name}
                      </p>
                      <p className="text-sm text-gray-500">{entry.neighborhood}</p>
                      <p className="mt-1 text-sm text-gray-600">{entry.blurb}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-neutral-100 px-4 py-2 text-center">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Elo</p>
                      <p className="text-lg font-semibold text-gray-900">{entry.elo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/home")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                    >
                      <Share2 size={16} />
                      Share to group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
