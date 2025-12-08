import React from 'react';

const SocialProof = () => {
  const brands = [
    { name: "Yelp", opacity: "opacity-80" },
    { name: "OpenTable", opacity: "opacity-60" },
    { name: "UberEats", opacity: "opacity-60" },
    { name: "Resy", opacity: "opacity-60" },
    { name: "DoorDash", opacity: "opacity-60" },
  ];

  return (
    <div className="w-full py-12 border-t border-gray-100 bg-white relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-sm font-medium text-gray-500 whitespace-nowrap">
            Powered by intelligence from
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-8 md:gap-12 w-full grayscale hover:grayscale-0 transition-all duration-500">
            {/* Using text for logos to avoid external SVG dependencies that might break, simulating logos with font styles */}
            
            <div className="flex items-center gap-1 font-bold text-xl tracking-tight text-gray-800 hover:text-[#FF1A1A] transition-colors">
               <span className="text-[#FF1A1A]">yelp</span>
               <span className="hidden md:inline text-xs font-normal text-gray-400 align-top ml-1">API</span>
            </div>

            <div className="flex items-center font-serif font-bold text-xl tracking-wide text-gray-400">
                OpenTable
            </div>

            <div className="flex items-center font-sans font-bold text-xl tracking-tight text-gray-400">
                <span className="text-green-600 font-medium">Uber</span><span className="font-bold">Eats</span>
            </div>
             
             <div className="flex items-center font-mono font-bold text-xl tracking-widest text-gray-400">
                RESY
            </div>
            
            <div className="flex items-center italic font-bold text-xl text-gray-400">
                DoorDash
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialProof;