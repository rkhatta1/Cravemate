import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  MapPin,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

// --- UI Mocks for the Feature Tabs ---

const MockChatUI = () => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto transform transition-all hover:scale-[1.02] duration-500">
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
      <div className="w-3 h-3 rounded-full bg-red-400" />
      <div className="w-3 h-3 rounded-full bg-yellow-400" />
      <div className="w-3 h-3 rounded-full bg-green-400" />
      <div className="ml-auto text-xs font-bold text-gray-400">#taco-tuesday</div>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex gap-3 items-end">
        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
          <img src="https://picsum.photos/id/64/100/100" alt="User avatar" />
        </div>
        <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2 text-sm text-gray-800">
          <span className="font-bold text-yelp-red bg-red-50 px-1 rounded">@yelp</span>{' '}
          best ramen spot in SoHo that fits 6 people?
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-full bg-yelp-red shrink-0 flex items-center justify-center text-white">
          <Zap size={14} />
        </div>
        <div className="space-y-2 w-full">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-none p-3 w-full">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                <img
                  src="https://picsum.photos/200/200?food=ramen"
                  className="w-full h-full object-cover"
                  alt="Suggested restaurant"
                />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Ramen Ishida</div>
                <div className="flex items-center gap-1 text-xs text-yellow-500 mt-1">
                  ★★★★★ <span className="text-gray-400">(482)</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  "Great for groups • Vegan broth avail..."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MockVibeUI = () => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto relative p-6">
    <div className="text-center mb-6">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
        Vibe Check • Round 2/3
      </h4>
      <h3 className="text-lg font-bold text-gray-900">Which vibe is more you?</h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="border-2 border-transparent hover:border-yelp-red hover:bg-red-50 rounded-xl p-4 cursor-pointer transition-all bg-gray-50 text-center group">
        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🕯️</div>
        <div className="font-bold text-sm text-gray-900">Cozy & Dim</div>
        <div className="text-[10px] text-gray-500 mt-1">Intimate conversations</div>
      </div>
      <div className="border-2 border-transparent hover:border-yelp-red hover:bg-red-50 rounded-xl p-4 cursor-pointer transition-all bg-gray-50 text-center group">
        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🪩</div>
        <div className="font-bold text-sm text-gray-900">Loud & Lively</div>
        <div className="text-[10px] text-gray-500 mt-1">Party atmosphere</div>
      </div>
    </div>
    <div className="mt-6 flex justify-center">
      <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-2/3 bg-yelp-red" />
      </div>
    </div>
  </div>
);

const MockLeaderboardUI = () => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto">
    <div className="bg-neutral-900 text-white p-4 flex justify-between items-center">
      <div className="font-bold flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" /> Top Tacos
      </div>
      <div className="text-xs bg-white/10 px-2 py-1 rounded">NYC</div>
    </div>
    <div className="divide-y divide-gray-50">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="font-mono font-bold text-gray-300 w-4">{index}</div>
          <div className="flex-1">
            <div className="font-bold text-sm text-gray-900">
              {index === 1 ? 'Los Tacos No. 1' : index === 2 ? 'Tacombi' : 'Birria-Landia'}
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-yelp-red h-full"
                style={{ width: `${100 - index * 15}%` }}
              />
            </div>
          </div>
          <div className="text-xs font-bold text-gray-900">{1500 - index * 120}</div>
        </div>
      ))}
    </div>
    <div className="p-3 bg-gray-50 text-center text-xs font-bold text-yelp-red cursor-pointer">
      View all 50 spots →
    </div>
  </div>
);

const MockInviteUI = () => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce">
      <Check size={28} />
    </div>
    <h3 className="text-xl font-bold text-gray-900">It's a Date!</h3>
    <p className="text-sm text-gray-500 mt-1 mb-6">
      You're going to <span className="font-bold text-gray-900">Los Tacos No. 1</span>
    </p>

    <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 text-left mb-4">
      <div className="flex items-center gap-3 mb-2">
        <Calendar size={16} className="text-gray-400" />
        <span className="text-sm font-medium">Friday, Oct 24 • 7:00 PM</span>
      </div>
      <div className="flex items-center gap-3">
        <Users size={16} className="text-gray-400" />
        <span className="text-sm font-medium">6 confirmed guests</span>
      </div>
    </div>
    <button
      type="button"
      className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
    >
      Add to Calendar
    </button>
  </div>
);

// --- Main Component ---

const Features = ({ onSignIn, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const resumeTimeoutRef = useRef(null);

  const tabs = [
    {
      id: 'chat',
      title: 'Yelp AI Chat',
      description:
        'Tag @yelp in your chat. It’s like having a foodie concierge who knows exactly what your friends hate.',
      icon: <MessageCircle size={18} />,
      component: <MockChatUI />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'vibe',
      title: 'Vibe Check',
      description:
        'Play a quick game of "This or That" to build your taste profile. We don’t just guess, we know your vibe.',
      icon: <Sparkles size={18} />,
      component: <MockVibeUI />,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboards',
      description:
        'Settle the "Best Pizza" debate. Rank local favorites in real-time based on community battles.',
      icon: <Trophy size={18} />,
      component: <MockLeaderboardUI />,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      id: 'invite',
      title: 'Smart Invites',
      description:
        'Pin a decision without the chaos. Send an invite card, track RSVPs, and lock it in.',
      icon: <Calendar size={18} />,
      component: <MockInviteUI />,
      color: 'bg-green-50 text-green-600',
    },
  ];

  useEffect(() => {
    if (!isAutoRotating) return undefined;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoRotating, tabs.length]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handleTabClick = (index) => {
    setActiveTab(index);
    setIsAutoRotating(false);

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoRotating(true);
    }, 6000);
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-serif">
            The Dining Decision Suite
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Everything you need to go from "I'm hungry" to "Reservation confirmed" in one
            app.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="w-full lg:w-1/3 space-y-4">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(index)}
                className={`w-full text-left p-6 rounded-2xl transition-all duration-300 border-2 group relative overflow-hidden ${
                  activeTab === index
                    ? 'border-yelp-red/80 bg-gray-50 shadow-sm'
                    : 'border-transparent hover:bg-white hover:shadow-md bg-white'
                }`}
              >
                <div className="flex items-center gap-4 mb-2 relative z-10">
                  <div
                    className={`p-2 rounded-lg ${
                      activeTab === index
                        ? tab.color
                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 duration-300'
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      activeTab === index ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {tab.title}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed pl-[3.25rem] relative z-10 ${
                    activeTab === index ? 'text-gray-700 block' : 'text-gray-400 hidden lg:block'
                  }`}
                >
                  {tab.description}
                </p>

                {activeTab === index && isAutoRotating && (
                  <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
                    <div className="h-full bg-yelp-red/80 animate-[width_5s_linear]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="w-full lg:w-2/3 relative h-[500px] bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center p-8 lg:p-12 overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-100 to-orange-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10 w-full transition-all duration-500 transform">
              {tabs[activeTab].component}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900">Why Cravemate works</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          <div className="md:col-span-2 bg-neutral-900 rounded-3xl p-8 relative overflow-hidden text-white group">
            <div className="relative z-10 max-w-sm">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Users className="text-white" />
              </div>
              <h4 className="text-2xl font-bold mb-3">Group DNA</h4>
              <p className="text-gray-400 leading-relaxed">
                We combine everyone's dietary restrictions, budget, and taste history into a
                single "Group Profile". No more forgetting that Mike hates cilantro.
              </p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-40 group-hover:opacity-60 duration-400 transition-opacity">
              <div className="flex -space-x-4">
                <div className="w-24 h-24 rounded-full bg-red-500 mix-blend-screen animate-float" />
                <div className="w-24 h-24 rounded-full bg-blue-500 mix-blend-screen animate-float-delayed" />
                <div
                  className="w-24 h-24 rounded-full bg-green-500 mix-blend-screen animate-float"
                  style={{ animationDuration: '4s' }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 relative overflow-hidden duration-300 hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center mb-4 text-yelp-red">
                <MapPin size={20} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Location First</h4>
              <p className="text-sm text-gray-500 mb-6">
                Auto-detects the best meeting point for your group based on where everyone is
                coming from.
              </p>
              <div className="mt-auto bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">
                  FASTEST
                </div>
                <div className="text-xs font-bold text-gray-700">SoHo • 12 mins avg</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-3xl p-8 border border-green-100 hover:border-green-400 duration-300 transition-colors">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-green-700 shadow-sm border border-green-100">
                  Vegan
                </span>
                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-green-700 shadow-sm border border-green-100">
                  GF
                </span>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mt-auto">Dietary Safety</h4>
              <p className="text-sm text-green-800 mt-2">
                Restaurants are automatically filtered to ensure everyone has something to eat.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 bg-gradient-to-r from-yelp-red to-orange-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-30 duration-400 transition-opacity" />
            <div className="relative z-10">
              <h4 className="text-2xl font-bold mb-2">Ready to eat?</h4>
              <p className="text-red-100">
                Start your first group chat in seconds. No account required to join.
              </p>
            </div>
            <button
              type="button"
              onClick={onSignIn}
              disabled={isLoading}
              className="relative z-10 bg-white text-yelp-red px-6 py-3 rounded-full font-bold shadow-lg duration-300 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 shrink-0 disabled:opacity-60 disabled:hover:shadow-lg disabled:hover:scale-100"
            >
              Start a Group <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
