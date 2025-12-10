"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Sidebar from "@/components/chat/Sidebar";
import {
  Clock3,
  Crown,
  Loader2,
  MapPin,
  PanelLeft,
  Plus,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [dishInput, setDishInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gameOpen, setGameOpen] = useState(false);
  const [gamePair, setGamePair] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");

  useEffect(() => {
    if (!locationTouched && session?.user?.location) {
      setLocationInput(session.user.location);
    }
  }, [session, locationTouched]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("cravemate-recent-leaderboards");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.warn("Failed to parse leaderboard history", err);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    const loadGroups = async () => {
      try {
        const response = await fetch("/api/groups");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Unable to load chats");
        if (active) {
          setGroups(payload.groups || []);
        }
      } catch (err) {
        console.error("Failed to load groups", err);
      }
    };
    loadGroups();
    return () => {
      active = false;
    };
  }, [status]);

  const subtitle = useMemo(() => {
    if (!leaderboard) {
      return "Kick off a leaderboard for your crew's cravings. Pick a dish and we'll seed it with Yelp intel.";
    }
    return `Tracking the best ${leaderboard.dish} spots around ${leaderboard.location}. Keep voting to nudge the rankings.`;
  }, [leaderboard]);

  const locationDisplay =
    leaderboard?.location || locationInput || session?.user?.location || "No city set";

  const persistRecent = (payload) => {
    if (typeof window === "undefined") return;
    const key = `${payload.dish.toLowerCase()}::${payload.location.toLowerCase()}`;
    const next = [
      { ...payload, key, timestamp: Date.now() },
      ...recentSearches.filter((item) => item.key !== key),
    ].slice(0, 8);
    setRecentSearches(next);
    localStorage.setItem("cravemate-recent-leaderboards", JSON.stringify(next));
  };

  const handleCreateLeaderboard = async (event) => {
    event.preventDefault();
    const trimmedDish = dishInput.trim();
    const trimmedLocation = locationInput.trim();
    if (!trimmedDish) {
      setError("Give us a dish to rank—tacos, ramen, vegan pastries, anything.");
      return;
    }
    if (!trimmedLocation) {
      setError("Set a city or zip for this leaderboard. This won't touch your profile.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/leaderboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish: trimmedDish, location: trimmedLocation }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create leaderboard");
      }
      setLeaderboard(payload.leaderboard);
      setShowAllEntries(false);
      persistRecent({
        dish: payload.leaderboard.dish,
        location: payload.leaderboard.location,
      });
      setDishInput("");
    } catch (apiError) {
      setError(apiError.message || "Failed to create leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const sortedEntries = useMemo(() => {
    if (!leaderboard?.entries) return [];
    return [...leaderboard.entries].sort(
      (a, b) => (b.elo ?? 1000) - (a.elo ?? 1000)
    );
  }, [leaderboard]);

  const visibleEntries = sortedEntries.slice(
    0,
    showAllEntries ? sortedEntries.length : 10
  );
  const hasMoreEntries = sortedEntries.length > visibleEntries.length;

  const handleRecentSelect = async (item) => {
    setDishInput(item.dish);
    setLocationInput(item.location);
    setLocationTouched(true);
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/leaderboards?dish=${encodeURIComponent(item.dish)}&location=${encodeURIComponent(
          item.location
        )}`
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Leaderboard missing, try creating it.");
      }
      setLeaderboard(payload.leaderboard);
      setShowAllEntries(false);
    } catch (err) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGamePair = async (anchorId) => {
    if (!leaderboard?.id) return false;
    try {
      setGameLoading(true);
      setGameError("");
      const query = anchorId ? `?anchor=${anchorId}` : "";
      const response = await fetch(
        `/api/leaderboards/${leaderboard.id}/game${query}`
      );
      if (response.status === 204) {
        setGamePair(null);
        setGameError("No fresh matchups left for this leaderboard.");
        return false;
      }
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to pull a match");
      }
      setGamePair(payload.pair || null);
      return true;
    } catch (err) {
      setGamePair(null);
      setGameError(err.message || "Unable to pull a matchup.");
      return false;
    } finally {
      setGameLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!leaderboard?.id) return;
    setGameOpen(true);
    setGamePair(null);
    setGameError("");
    const success = await fetchGamePair();
    if (!success) {
      setGameOpen(false);
    }
  };

  const submitMatch = async (payload) => {
    if (!leaderboard?.id) return false;
    try {
      setGameLoading(true);
      const response = await fetch(`/api/leaderboards/${leaderboard.id}/game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to record match");
      }
      if (data?.winner || data?.loser) {
        setLeaderboard((prev) => {
          if (!prev) return prev;
          const updatedEntries = prev.entries.map((entry) => {
            if (entry.id === data.winner?.id) return { ...entry, elo: data.winner.elo };
            if (entry.id === data.loser?.id) return { ...entry, elo: data.loser.elo };
            return entry;
          });
          return { ...prev, entries: updatedEntries };
        });
      }
      return true;
    } catch (err) {
      setGameError(err.message || "Unable to record your pick.");
      return false;
    } finally {
      setGameLoading(false);
    }
  };

  const handlePick = async (winnerId) => {
    if (!gamePair || gamePair.length < 2) return;
    const loser = gamePair.find((entry) => entry.id !== winnerId);
    if (!loser) return;
    const success = await submitMatch({
      entryAId: gamePair[0].id,
      entryBId: gamePair[1].id,
      winnerId,
      loserId: loser.id,
    });
    if (!success) return;
    const hasNext = await fetchGamePair(winnerId);
    if (!hasNext) {
      setGameOpen(false);
    }
  };

  const handleSkipMatch = async () => {
    if (!gamePair || gamePair.length < 2) return;
    const success = await submitMatch({
      entryAId: gamePair[0].id,
      entryBId: gamePair[1].id,
      skip: true,
    });
    if (!success) return;
    const hasNext = await fetchGamePair();
    if (!hasNext) {
      setGameOpen(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar
        groups={groups}
        activeGroupId={null}
        onSelectGroup={(groupId) => router.push(`/home?group=${groupId}`)}
        onCreateGroup={() => router.push("/home?create=1")}
        sessionName={session?.user?.name}
        onSignOut={() => signOut({ callbackUrl: "/" })}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed left-3 top-3 z-20 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:border-yelp-red hover:text-yelp-red md:left-5 ${
            sidebarOpen ? "md:opacity-0 md:pointer-events-none" : ""
          }`}
        >
          <PanelLeft size={18} />
        </button>

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">

          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="space-y-4">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <form onSubmit={handleCreateLeaderboard} className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yelp-red">
                    <Sparkles size={14} />
                    Leaderboard Lab
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dish or craving
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. butter chicken"
                      value={dishInput}
                      onChange={(event) => setDishInput(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      City / Zip (won't change your profile)
                    </label>
                    <input
                      type="text"
                      placeholder="Tempe, AZ"
                      value={locationInput}
                      onChange={(event) => {
                        setLocationInput(event.target.value);
                        if (!locationTouched) setLocationTouched(true);
                      }}
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Working…
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create leaderboard
                      </>
                    )}
                  </button>
                  {error && <p className="text-sm font-semibold text-yelp-red">{error}</p>}
                </form>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recent searches
                  </p>
                  {recentSearches.length > 0 && (
                    <span className="text-xs text-gray-400">{recentSearches.length}</span>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Nothing here yet—every leaderboard you create shows up below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleRecentSelect(item)}
                        className="w-full rounded-2xl border border-gray-100 px-3 py-2 text-left text-sm transition hover:border-yelp-red hover:bg-yelp-red/5"
                      >
                        <p className="font-semibold text-gray-900">{item.dish}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} />
                          {item.location}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock3 size={12} />
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6">
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
                      {locationDisplay}
                    </p>
                    <p className="text-xs text-gray-500">
                      Leaderboards stay city-specific to spare the API bill.
                    </p>
                  </div>
                </div>
              </header>

              {!leaderboard && (
                <section className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center text-gray-500">
                  <p className="text-lg font-semibold text-gray-800">No leaderboard yet.</p>
                  <p className="mt-2 text-sm">
                    Plug in a dish to spin up the first bracket, then invite your group to keep playing.
                  </p>
                </section>
              )}

              {leaderboard && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      {leaderboard.dish} · {leaderboard.location}
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Seeded rankings
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Top picks ranked by community Elo—run the game to keep them fresh.
                    </p>
                    <button
                      onClick={handleStartGame}
                      className="rounded-2xl bg-yelp-red px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yelp-dark"
                      disabled={!leaderboard}
                    >
                      Start Elo game
                    </button>
                  </div>
                  <div className="space-y-3">
                    {visibleEntries.map((entry, index) => {
                      const position = index + 1;
                      const eloScore = typeof entry.elo === "number" ? entry.elo : 1000;
                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center"
                        >
                          <div className="flex flex-1 items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yelp-red/10 text-lg font-bold text-yelp-red">
                              {position}
                            </div>
                            {entry.meta?.image && (
                              <div className="hidden h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 sm:block">
                                <img
                                  src={entry.meta.image}
                                  alt={entry.businessName}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <div>
                              <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                {position === 1 && <Crown className="h-5 w-5 text-amber-400" />}
                                {entry.businessName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {entry.neighborhood || entry.meta?.address || "Add details"}
                              </p>
                              {entry.meta?.rating ? (
                                <p className="mt-1 text-xs text-gray-500">
                                  {entry.meta.rating}★ · {entry.meta.reviewCount || "—"} reviews ·{" "}
                                  {entry.meta.price || "price TBD"}
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-gray-600">{entry.blurb}</p>
                              )}
                              {entry.meta?.url && (
                                <a
                                  href={entry.meta.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-yelp-red"
                                >
                                  View on Yelp
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-neutral-100 px-4 py-2 text-center">
                              <p className="text-xs uppercase tracking-wide text-gray-500">Elo</p>
                              <p className="text-lg font-semibold text-gray-900">{eloScore}</p>
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
                      );
                    })}
                  </div>
                  {hasMoreEntries && (
                    <div className="pt-4 text-center">
                      <button
                        className="text-sm font-semibold text-yelp-red hover:text-yelp-dark"
                        onClick={() => setShowAllEntries(true)}
                      >
                        View entire leaderboard ({leaderboard.entries.length} spots)
                      </button>
                    </div>
                 )}
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {gameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Elo mini game
                </p>
                <h3 className="text-2xl font-bold text-gray-900">
                  Pick the place that fits the vibe
                </h3>
              </div>
              <button
                onClick={() => {
                  setGameOpen(false);
                  setGamePair(null);
                  setGameError("");
                }}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {gameError && (
              <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {gameError}
              </p>
            )}

            <div className="mt-6">
              {!gamePair && gameLoading && (
                <div className="flex h-48 items-center justify-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {gamePair && (
                <div className="grid gap-4 md:grid-cols-2">
                  {gamePair.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handlePick(entry.id)}
                      disabled={gameLoading}
                      className="rounded-3xl border border-gray-200 bg-white px-4 py-5 text-left shadow-sm transition hover:border-yelp-red hover:bg-yelp-red/5 disabled:opacity-60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {entry.meta?.categories?.[0] || "Restaurant"}
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {entry.businessName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.neighborhood || entry.meta?.address || "Neighborhood TBD"}
                      </p>
                      {entry.meta?.image && (
                        <div className="mt-3 h-32 w-full overflow-hidden rounded-2xl bg-gray-100">
                          <img
                            src={entry.meta.image}
                            alt={entry.businessName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <p className="mt-3 text-sm text-gray-600">{entry.blurb}</p>
                      {typeof entry.elo === "number" && (
                        <p className="mt-3 text-xs font-semibold text-gray-400">
                          Elo: {entry.elo}
                        </p>
                      )}
                      {entry.meta?.url && (
                        <a
                          href={entry.meta.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yelp-red"
                        >
                          View on Yelp
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {!gamePair && !gameLoading && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center text-sm text-gray-500">
                  <p>No more matchups available. You’ve trained this leaderboard!</p>
                  <button
                    onClick={() => {
                      setGameOpen(false);
                      setGamePair(null);
                      setGameError("");
                    }}
                    className="text-sm font-semibold text-yelp-red hover:text-yelp-dark"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleSkipMatch}
                disabled={!gamePair || gameLoading}
                className="rounded-2xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 transition hover:border-gray-300 disabled:opacity-40"
              >
                Skip match
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  Winner stays on. Loser gets swapped for a new challenger.
                </span>
                <button
                  onClick={() => {
                    setGameOpen(false);
                    setGamePair(null);
                    setGameError("");
                  }}
                  className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Exit game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
