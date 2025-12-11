import React, { useEffect, useMemo, useState } from "react";
import { PanelLeft, Search, Flame, Utensils, MapPin, Loader2 } from "lucide-react";
import LeaderboardCard from "./LeaderboardCard";

const getIconForDish = (dish = "") => {
  const term = dish.toLowerCase();
  if (term.includes("taco")) return "🌮";
  if (term.includes("pizza")) return "🍕";
  if (term.includes("bar") || term.includes("drink")) return "🍹";
  if (term.includes("coffee")) return "☕️";
  return "🍽️";
};

const LeaderboardOverview = ({
  leaderboards = [],
  sidebarOpen,
  onOpenSidebar,
  onSelectLeaderboard,
  onStartRanking,
  locationInput,
  locationSuggestions = [],
  locationLoading = false,
  onLocationChange,
  onLocationSelect,
  onLocationFocus,
  onLocationBlur,
  locationRef,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return leaderboards;
    return leaderboards.filter((board) => {
      const haystack = `${board.dish || ""} ${board.title || ""}`.toLowerCase();
      return haystack.includes(searchTerm.trim().toLowerCase());
    });
  }, [leaderboards, searchTerm]);

  const decorated = filtered.map((board) => ({
    ...board,
    title: board.title || board.dish,
    icon: board.icon || getIconForDish(board.dish || board.title),
  }));

  useEffect(() => {
    setVisibleCount(8);
  }, [searchTerm, filtered.length]);

  const visibleBoards = decorated.slice(0, visibleCount);
  const canViewMore = decorated.length > visibleBoards.length;

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-hidden">
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <button
          onClick={onOpenSidebar}
          className={`p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors mr-2 ${
            sidebarOpen ? "md:opacity-0 md:pointer-events-none" : ""
          }`}
        >
          <PanelLeft size={20} />
        </button>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-yelp-red focus:border-yelp-red sm:text-sm transition-all"
              placeholder="Search leaderboards (e.g. Sushi in West Village)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-[220px]" ref={locationRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-yelp-red focus:border-yelp-red sm:text-sm transition-all"
              placeholder="City, State"
              value={locationInput}
              onFocus={onLocationFocus}
              onBlur={onLocationBlur}
              onChange={(e) => onLocationChange?.(e.target.value)}
            />
            {locationLoading && (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            {locationSuggestions.length > 0 && (
              <div className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {locationSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onLocationSelect?.(suggestion)}
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
          <div className="flex items-center gap-3">
            <button
              onClick={onStartRanking}
              className="hidden sm:flex items-center gap-2 bg-yelp-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yelp-dark transition-colors shadow-lg shadow-red-200 whitespace-nowrap"
            >
              <Flame size={16} />
              Create New
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leaderboard Overview</h1>
              <p className="text-gray-500 mt-1 max-w-2xl text-sm">
                See how local favorites stack up. Real-time rankings based on community votes and
                "This or That" battles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleBoards.map((board) => (
              <LeaderboardCard key={board.id} board={board} onSelect={onSelectLeaderboard} />
            ))}
            {!decorated.length && (
              <div className="col-span-full rounded-xl border border-dashed border-gray-200 bg-white/80 p-8 text-center text-gray-500">
                No leaderboards found. Try creating one to get started.
              </div>
            )}
          </div>

          {canViewMore && (
            <div className="flex justify-center">
              <button
                onClick={() => setVisibleCount((count) => Math.min(count + 8, decorated.length))}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300"
              >
                View more ({decorated.length - visibleBoards.length} left)
              </button>
            </div>
          )}

          <div className="bg-neutral-900 rounded-2xl p-8 text-center text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-3">Can't decide where to eat?</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Rank your local favorites in a quick game of "This or That" and help your city decide
                the best spots.
              </p>
              <button
                onClick={onStartRanking}
                className="bg-white text-neutral-900 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <Utensils size={18} />
                Start Ranking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardOverview;
