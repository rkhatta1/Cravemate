/* eslint-disable react/no-unescaped-entities */
"use client";

import { useMemo, useState } from "react";
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

const QUESTIONS = [
  {
    prompt: "Where would you go shopping for peanut butter?",
    scenario: "You need the perfect jar for a foodie friend's gift basket.",
    options: [
      {
        id: "artisan-pantr",
        place: "Urban Nut Pantry",
        review:
          "Best artisan peanut butter in the city. Staff walks you through pairings like you're picking wine. Pricey, but an experience.",
        vibe: "cozy",
        keywords: "Hand-crafted, staff-led, story filled",
      },
      {
        id: "tj-staples",
        place: "Trader Joe's",
        review:
          "Clean ingredient list, priced right, never disappoints. I grab two jars because we go through them so fast.",
        vibe: "efficient",
        keywords: "Dependable, simple, practical",
      },
    ],
  },
  {
    prompt: "Where do you caffeinate before a brainstorm?",
    scenario: "45 minutes between meetings, laptop in tow.",
    options: [
      {
        id: "analog-lounge",
        place: "Analog 3rd Wave",
        review:
          "Event-level pour overs, vinyl spinning all day, and a barista who remembers everyone's project. Electric yet zen.",
        vibe: "luxe",
        keywords: "Design-forward, curated, intentional",
      },
      {
        id: "late-macchiato",
        place: "Fuel & Flour",
        review:
          "Open kitchen energy, sticky buns coming out nonstop, and power outlets at every communal table. Loud in the best way.",
        vibe: "lively",
        keywords: "Communal, high-energy, pastry-fueled",
      },
    ],
  },
  {
    prompt: "Where are you grabbing late-night noodles?",
    scenario: "It's after a show and the group chat is still lit.",
    options: [
      {
        id: "steam-broth",
        place: "Midnight Tonkotsu",
        review:
          "Broth simmered 18 hours, chef talks about the farms, and there's a seasonal pickle flight. Chill lighting, jazz playlist.",
        vibe: "cozy",
        keywords: "Slow food, intimate, soulful",
      },
      {
        id: "karaoke-ramen",
        place: "Riot Ramen Club",
        review:
          "Sake slushies, shared tables, someone always starts karaoke. The chili crisp hits like confetti.",
        vibe: "lively",
        keywords: "Party vibes, bold flavors, group-ready",
      },
    ],
  },
  {
    prompt: "How do you celebrate a big win?",
    scenario: "You just shipped a release and want to flex.",
    options: [
      {
        id: "chef-counter",
        place: "Counter & Co.",
        review:
          "12-course tasting, chef narrates every dish, the playlist is curated weekly. It's intimate but still playful.",
        vibe: "luxe",
        keywords: "Polished, exclusive, chef-driven",
      },
      {
        id: "backyard-smoke",
        place: "Smokestack Backyard",
        review:
          "Picnic tables, vinyl-only DJ, shareable platters that never end. Everyone leaves with smoked citrus on their clothes.",
        vibe: "adventurous",
        keywords: "Rustic, abundant, sensory",
      },
    ],
  },
  {
    prompt: "Where would you plan a spontaneous picnic?",
    scenario: "Blue-sky day, 20 minutes to grab provisions.",
    options: [
      {
        id: "farmstand",
        place: "Gathered Greens Market",
        review:
          "Everything is hyper-local, they stuff the tote with flowers, and the staff will point you to the best park bench.",
        vibe: "cozy",
        keywords: "Seasonal, conversational, neighborhood",
      },
      {
        id: "global-street",
        place: "Global Street Hall",
        review:
          "Ten rotating vendors, K-pop on big speakers, QR code ordering. Perfect for mixing bites and keeping it moving.",
        vibe: "adventurous",
        keywords: "Fast, eclectic, playful",
      },
    ],
  },
];

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
    setStep,
  } = useUserStore();

  const totalRounds = QUESTIONS.length;
  const progress = (vibeGameAnswers.length / totalRounds) * 100;
  const isComplete = vibeGameAnswers.length === totalRounds;
  const currentQuestion = QUESTIONS[vibeGameAnswers.length];
  const router = useRouter();

  const vibeReport = useMemo(
    () => buildVibeReport(vibeGameAnswers),
    [vibeGameAnswers]
  );

  const handleSelect = (option) => {
    if (!currentQuestion) return;
    const answerPayload = {
      prompt: currentQuestion.prompt,
      scenario: currentQuestion.scenario,
      place: option.place,
      review: option.review,
      vibe: option.vibe,
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
          style={{ width: `${progress}%` }}
        />
      </div>
        <div className="flex-1 space-y-6 overflow-y-auto">
          {!isComplete && currentQuestion && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-white p-6">
                <p className="text-sm uppercase tracking-wide text-orange-600 font-semibold">
                  Where would you…
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentQuestion.prompt}
                </h2>
                <p className="text-gray-500 mt-2">{currentQuestion.scenario}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    className="text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-orange-400 hover:shadow-md transition-all"
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                      {option.place}
                    </p>
                    <p className="mt-2 text-gray-700 leading-relaxed">{option.review}</p>
                    <p className="mt-4 text-sm text-gray-500">{option.keywords}</p>
                  </button>
                ))}
              </div>
            </div>
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
                      <h2 className="text-2xl font-bold text-gray-900">
                        {vibeReport.headline}
                      </h2>
                    </div>
                    <button
                      onClick={restartGame}
                      className="text-sm font-semibold text-gray-500 hover:text-gray-900"
                    >
                      Start over
                    </button>
                  </div>
                  <p className="text-gray-600">{vibeReport.summary}</p>
                  <p className="text-sm text-gray-500">{vibeReport.secondary}</p>
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
