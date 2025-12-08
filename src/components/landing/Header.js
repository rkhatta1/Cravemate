import React from 'react';
import { CravemateLogo } from './Icons';
import GoogleSignInButton from './GoogleSignInButton';

const Header = ({ onSignIn }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center cursor-pointer">
            <CravemateLogo />
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-6 text-sm font-medium text-gray-600">
              <a href="#" className="hover:text-black transition-colors">How it works</a>
              <a href="#" className="hover:text-black transition-colors">Features</a>
              <a href="#" className="hover:text-black transition-colors">Pricing</a>
            </nav>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
               <GoogleSignInButton onClick={onSignIn} variant="dark" text="Get Started" className="py-2 px-4 text-sm" />
            </div>
          </div>

          <div className="md:hidden">
             <GoogleSignInButton onClick={onSignIn} variant="dark" text="Sign In" className="py-2 px-3 text-xs" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
