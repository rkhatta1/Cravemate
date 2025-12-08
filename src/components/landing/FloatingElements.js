import React from 'react';
import { MapPin, MessageCircle, Star, Utensils, Zap } from 'lucide-react';

const ChatBubble = ({ avatar, name, message, time, color = "bg-white", className, rotation }) => (
  <div 
    className={`absolute p-4 rounded-2xl shadow-xl border border-gray-100 ${color} max-w-[280px] z-10 ${className} transition-transform hover:scale-105 duration-300`}
    style={{ transform: rotation }}
  >
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-200">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-xs text-gray-900">{name}</span>
          <span className="text-[10px] text-gray-400">{time}</span>
        </div>
        <div className="text-sm text-gray-700 mt-0.5 leading-snug">
          {message}
        </div>
      </div>
    </div>
  </div>
);

const AppCard = ({ className, rotation }) => (
  <div 
    className={`absolute bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden w-[320px] ${className}`}
    style={{ transform: rotation }}
  >
    <div className="bg-yelp-red p-4 flex items-center justify-between">
      <div className="text-white font-bold flex items-center gap-2">
        <Zap size={16} fill="white" />
        Yelp AI
      </div>
      <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-medium">Top Match</div>
    </div>
    <div className="p-4">
      <div className="h-32 bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
        <img src="https://picsum.photos/400/300?food=tacos" alt="Food" className="w-full h-full object-cover" />
        <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
          <Star size={10} className="text-yellow-400" fill="#facc15" /> 4.9
        </div>
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">Taco Stand Collective</h3>
      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <MapPin size={10} /> 0.3 mi away • Mexican • $$
      </p>
      <div className="flex gap-2 mb-4">
        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium border border-red-100">Gluten-Free Options</span>
        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-full font-medium border border-green-100">Outdoor Seating</span>
      </div>
      <button className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        Reserve Table
      </button>
    </div>
  </div>
);

const FloatingElements = () => {
  return (
    <div className="w-full justify-center items-center overflow-hidden bg-gradient-to-b from-white to-gray-50">
    <div className="relative mx-auto max-w-[75%] h-[600px] overflow-hidden perspective-[2000px]">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

      {/* Central App Card */}
      <div className="absolute left-[40%] top-20 -translate-x-1/2 z-20 hover:z-30 transition-all duration-500 animate-float">
        <AppCard rotation="rotateX(10deg) rotateY(-5deg) rotateZ(2deg)" />
      </div>

      {/* Left Chat Bubbles */}
      <ChatBubble 
        avatar="https://picsum.photos/id/64/100/100" 
        name="Sarah" 
        time="12:03 PM"
        message={<span>We need a place with vegan options! 🌱</span>}
        className="top-32 left-[10%] lg:left-[20%] animate-float-delayed"
        rotation="rotate(-5deg) translateZ(50px)"
      />

      <ChatBubble 
        avatar="https://picsum.photos/id/91/100/100" 
        name="Mike" 
        time="12:04 PM"
        message={<span><span className="text-yelp-red font-bold">@yelp</span> Find us somewhere cool in SoHo suitable for 6 people.</span>}
        className="top-80 left-[5%] lg:left-[15%] z-30"
        rotation="rotate(3deg) translateZ(100px)"
      />

      {/* Right Chat Bubbles */}
      <ChatBubble 
        avatar="https://picsum.photos/id/177/100/100" 
        name="Jessica" 
        time="12:05 PM"
        message={<span>I'm craving spicy food today 🌶️</span>}
        className="top-40 right-[10%] lg:right-[20%] animate-float-delayed"
        rotation="rotate(6deg) translateZ(-20px)"
      />

      <div className="absolute top-80 right-[8%] lg:right-[18%] z-10 animate-float" style={{ animationDelay: '1s' }}>
         <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 rotate-[-4deg]">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-yelp-red">
                <Utensils size={20} />
            </div>
            <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Best Match</div>
                <div className="font-bold text-gray-900">Spicy Moon</div>
            </div>
            <div className="ml-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">
                98%
            </div>
         </div>
      </div>
      
      {/* Decorative blurred blobs */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

    </div>
    </div>
  );
};

export default FloatingElements;
