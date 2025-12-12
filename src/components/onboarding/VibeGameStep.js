/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

const VIBE_TRAITS = {
  cozy: {
    title: "Cozy Storyteller",
    description: "You gravitate toward staff that knows the regulars and menus that change with the seasons.",
  },
  adventurous: {
    title: "Adventurous Explorer",
    description: "You chase inventive plates, limited drops, and anything that's a little unexpected.",
  },
  lively: {
    title: "High-Energy Host",
    description: "Give you playlists, neon, and big tables—you feed off buzz and group-friendly chaos.",
  },
  luxe: {
    title: "Modern Indulgent",
    description: "You appreciate design-forward spaces, tasting menus, and polished service.",
  },
  efficient: {
    title: "Purposeful Minimalist",
    description: "You love clean counters, sharp service, and foods that hit the spot without the fuss.",
  },
};

const buildVibeReport = (answers) => {
  if (!answers.length) {
    return {
      headline: "Let's collect your vibe",
      summary: "Work through the mini game to generate a shareable ambience profile.",
      secondary: "",
      tags: [],
    };
  }

  const counts = answers.reduce((acc, answer) => {
    const key = answer.vibe || "cozy";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [primaryKey] = sorted[0];
  const [secondaryKey] = sorted[1] || [];

  const primaryTrait = VIBE_TRAITS[primaryKey] || {
    title: "Balanced Explorer",
    description: "You read the room and pick restaurants that match everyone else's mood.",
  };

  const tags = sorted.map(([tag]) => VIBE_TRAITS[tag]?.title || tag);

  return {
    headline: primaryTrait.title,
    summary: primaryTrait.description,
    secondary: secondaryKey
      ? `You also channel ${VIBE_TRAITS[secondaryKey]?.title?.toLowerCase()} energy when the group needs it.`
      : "Your picks were consistently in the same lane—instant clarity for @yelp.",
    tags,
  };
};

export default function VibeGameStep() {
  const { data: session, update } = useSession(); 
  const [isLoading, setIsLoading] = useState(false);
  const {
    profile,
    dietaryPrefs,
    favorites,
    vibeGameAnswers,
    setVibeAnswers,
    resetOnboarding,
    setStep,
    setFavorites,
    updateProfile,
    setDietaryPrefs,
  } = useUserStore();
  const [questions, setQuestions] = useState([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [vibeReport, setVibeReport] = useState({
    headline: "Let's collect your vibe",
    summary: "Work through the mini game to generate a shareable ambience profile.",
    tags: [],
  });
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState("");
  const gameFetchRef = useRef(false);
  const gameKeyRef = useRef("");

  const alreadyFinished = session?.user?.hasFinishedOnboarding;
  const totalRounds = Math.max(questions.length || 3, vibeGameAnswers.length || 0);
  const progress = (vibeGameAnswers.length / totalRounds) * 100;
  const progressValue = alreadyFinished ? 100 : progress;
  const isComplete = vibeGameAnswers.length === totalRounds || alreadyFinished;
  const currentQuestion = questions[vibeGameAnswers.length];
  const router = useRouter();

  const handleSelect = (option) => {
    if (!currentQuestion) return;
    const answerPayload = {
      prompt: currentQuestion.prompt,
      scenario: currentQuestion.scenario,
      place: option.place,
      review: option.review,
      cuisine: currentQuestion.cuisine,
      businessAlias: option.alias,
      businessName: option.place,
      vibe: option.vibe || "",
      keywords: option.keywords,
    };
    setVibeAnswers([...vibeGameAnswers, answerPayload]);
  };

  const undoLast = () => {
    if (!vibeGameAnswers.length) {
      setStep(2);
      return;
    }
    setVibeAnswers(vibeGameAnswers.slice(0, -1));
  };

  const restartGame = () => setVibeAnswers([]);

  const finishOnboarding = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const onboardingPayload = {
      profile,
      username: profile.username || null,
      dietaryPrefs,
      favorites,
      vibeReport,
      vibeGameAnswers,
    };

    try {
      const response = await fetch("/api/user/finish-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardingPayload),
      });

      if (response.ok) {
        await update({ hasFinishedOnboarding: true });
        resetOnboarding();
        router.push("/home");
      } else {
        // Handle error case
        console.error("Failed to finish onboarding");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to finish onboarding", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadGame = async () => {
      if (!favorites?.cuisines?.length || !profile?.location) return;
      if (alreadyFinished) return;
      const key = JSON.stringify({
        location: profile.location,
        cuisines: favorites.cuisines.slice(0, 3),
      });
      if (gameKeyRef.current === key && questions.length) return;
      if (gameFetchRef.current) return;
      gameFetchRef.current = true;
      gameKeyRef.current = key;
      setGameLoading(true);
      setGameError("");
      try {
        const response = await fetch("/api/onboarding/yelp-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuisines: favorites.cuisines,
            location: profile.location,
            limitPerCuisine: 2,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load picks");
        }
        const businesses = (payload.businesses || []).slice(0, 6);

        const deduped = [];
        const seen = new Set();
        for (const biz of businesses) {
          const keyAlias = biz.alias || biz.id;
          if (keyAlias && !seen.has(keyAlias)) {
            seen.add(keyAlias);
            deduped.push(biz);
          }
        }

        const reviews = await Promise.all(
          deduped.map(async (biz) => {
            try {
              const res = await fetch("/api/onboarding/yelp-review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  alias: biz.alias,
                  location: profile.location,
                }),
              });
              const data = await res.json();
              return {
                ...biz,
                review: data?.review || "",
              };
            } catch {
              return { ...biz, review: "" };
            }
          })
        );

        const grouped = favorites.cuisines.slice(0, 3).map((cuisine) => {
          const options = reviews.filter((biz) => biz.cuisine === cuisine).slice(0, 2);
          return {
            prompt: `Which ${cuisine} spot reads more like you?`,
            scenario: "Pick the review that feels most your vibe. No names, no logos, just feel.",
            cuisine,
            options: options.map((opt, idx) => ({
              id: `${opt.id || idx}`,
              place: opt.name || "Hidden",
              alias: opt.alias,
              review:
                opt.review ||
                "Service-forward and flavorful without trying too hard. Locals know this is a go-to.",
              keywords: cuisine,
            })),
          };
        });

        setQuestions(grouped.filter((q) => q.options.length >= 2));
      } catch (error) {
        console.error("load game error", error);
        setGameError(error.message || "Failed to load the vibe game");
      } finally {
        setGameLoading(false);
        gameFetchRef.current = false;
      }
    };

    loadGame();
  }, [favorites?.cuisines, profile?.location, questions.length, alreadyFinished]);

  useEffect(() => {
    const generateVibe = async () => {
      if (!isComplete || alreadyFinished) return;
      setVibeLoading(true);
      setVibeError("");
      try {
        const response = await fetch("/api/onboarding/vibe-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: profile.location,
            dietaryPrefs,
            cuisines: favorites?.cuisines || [],
            foods: favorites?.foods || [],
            gameRounds: questions,
            answers: vibeGameAnswers,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to generate vibe");
        }
        setVibeReport({
          headline: "Your vibe is ready",
          summary: payload.vibe,
          secondary: "",
          tags: [],
        });
      } catch (error) {
        console.error("vibe report error", error);
        setVibeError(error.message || "Failed to generate vibe report");
        setVibeReport(buildVibeReport(vibeGameAnswers));
      } finally {
        setVibeLoading(false);
      }
    };
    generateVibe();
  }, [isComplete, profile.location, dietaryPrefs, favorites, questions, vibeGameAnswers, alreadyFinished]);

  const effectiveQuestions = questions.length ? questions : [];
  const showGame = !isComplete && currentQuestion;

  useEffect(() => {
    const hydrateFromDb = async () => {
      try {
        const res = await fetch("/api/user/onboarding");
        if (!res.ok) return;
        const data = await res.json();
        if (data.location) updateProfile({ location: data.location, username: data.username });
        if (Array.isArray(data.dietaryPrefs)) setDietaryPrefs(data.dietaryPrefs);
        if (data.favorites) setFavorites(data.favorites);
        if (data.vibeReport) {
          setVibeReport(data.vibeReport);
          setVibeAnswers([]);
        }
      } catch (error) {
        console.warn("Failed to hydrate onboarding", error);
      }
    };
    hydrateFromDb();
  }, [updateProfile, setDietaryPrefs, setFavorites, setVibeAnswers]);

  return (
    <div className="flex h-auto flex-col overflow-hidden bg-[#fff6ec]">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 font-semibold">
              Vibe Game
            </p>
            <p className="text-lg font-bold text-gray-900">
              {isComplete
                ? "Your vibe profile is ready"
                : `Round ${vibeGameAnswers.length + 1} of ${totalRounds}`}
            </p>
          </div>
          <button
            onClick={undoLast}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            {vibeGameAnswers.length ? "← Undo last pick" : "← Back to favorites"}
          </button>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${progressValue}%` }}
        />
      </div>
        <div className="flex-1 space-y-6 overflow-y-auto">
          {!isComplete && (
            <>
              {gameLoading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading picks from Yelp…
                </div>
              )}
              {/* {gameError && (
                <p className="text-sm text-red-500">{gameError}</p>
              )} */}
              {!gameLoading && !currentQuestion && (
                <p className="text-sm text-gray-500">
                  Add a location and at least one cuisine to play the vibe game.
                </p>
              )}
              {currentQuestion && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-white p-6">
                    <p className="text-sm uppercase tracking-wide text-orange-600 font-semibold">
                      Where would you…
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentQuestion.prompt}
                    </h2>
                    <p className="text-gray-500 mt-2">{currentQuestion.scenario}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {currentQuestion.cuisine}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {currentQuestion.options.map((option, idx) => (
                      <button
                        key={option.id}
                        onClick={() => handleSelect(option)}
                        className="text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                          Option {idx + 1} · {currentQuestion.cuisine}
                        </p>
                        <p className="mt-2 text-gray-700 leading-relaxed">{option.review}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isComplete && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-orange-600 font-semibold">
                        Vibe report
                      </p>
                      {/* <h2 className="text-2xl font-bold text-gray-900">
                        {vibeReport.headline}
                      </h2> */}
                    </div>
                    {/* <button
                      onClick={restartGame}
                      className="text-sm font-semibold text-gray-500 hover:text-gray-900"
                    >
                      Start over
                    </button> */}
                  </div>
                  {vibeLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Crafting your vibe…
                    </div>
                  )}
                  {vibeError && (
                    <p className="text-sm text-red-500">{vibeError}</p>
                  )}
                  {vibeReport.summary && (
                    <p className="text-gray-600">{vibeReport.summary}</p>
                  )}
                  {vibeReport.secondary && (
                    <p className="text-sm text-gray-500">{vibeReport.secondary}</p>
                  )}
                  {vibeReport.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {vibeReport.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={finishOnboarding}
                  className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white hover:bg-gray-800 transition-transform active:scale-95 flex items-center justify-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  ) : (
                    "Jump into Cravemate →"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
