import React from 'react';
import { ProductHuntBadge } from './Icons';
import { Sparkles } from 'lucide-react';

const Pill = ({ children }) => (
  <span className="inline-flex items-center justify-center px-4 py-1 mx-1.5 border border-gray-300 rounded-full text-base md:text-xl lg:text-2xl font-medium text-gray-700 bg-white shadow-sm align-middle hover:border-yelp-red hover:text-yelp-red transition-colors cursor-default whitespace-nowrap">
    {children}
  </span>
);

const Hero = ({ onSignIn }) => {
  return (
    <div className="pt-32 md:pt-40 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10">
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-neutral-900 mb-8 leading-[1.1] md:leading-[1.1]">
        The future of dining <br className="hidden md:block" />
        is decided together.
      </h1>

      <div className="max-w-4xl mx-auto mb-12">
        <p className="text-lg md:text-2xl leading-relaxed text-gray-600 font-light">
          Imagine all your 
          <Pill>Cravings 🍕</Pill> 
          <Pill>Budgets 💸</Pill> 
          <Pill>Diets 🌱</Pill> 
          and 
          <Pill>Vibes ✨</Pill> 
          analyzed instantly in one smart group chat.
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto text-gray-500 mb-10 text-sm md:text-base">
        Stop the "I don't know, what do you want?" loop. Tag @yelp in your chat and let AI find the perfect table for everyone.
      </div>

      <div className="flex items-center justify-center mb-8">
        {/* Fake CTA that would trigger Google Auth */}
        <button onClick={onSignIn} className="group relative inline-flex items-center justify-center px-6 py-4 text-md font-bold text-white transition-all duration-200 bg-yelp-red font-sans rounded-full hover:bg-yelp-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yelp-red shadow-lg shadow-red-500/30">
            <span className="mr-2">Start a Group Chat</span>
            <Sparkles className="w-4 h-4" />
        </button>
      </div>
      

    </div>
  );
};

export default Hero;
